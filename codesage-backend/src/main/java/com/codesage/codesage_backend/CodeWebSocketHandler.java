package com.codesage.codesage_backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.async.ResultCallback;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.model.Frame;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class CodeWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final DockerClient dockerClient;
    private final Map<String, String> sessionToContainerMap = new ConcurrentHashMap<>();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    static class WebSocketMessage {
        public String type; 
        public String code;
        public String language;
        public String data;
    }

    static class ResponseMessage {
        public String type;
        public String data;

        public ResponseMessage(String type, String data) {
            this.type = type;
            this.data = data;
        }
    }

    public CodeWebSocketHandler() {
        String os = System.getProperty("os.name").toLowerCase();
        DefaultDockerClientConfig.Builder configBuilder = DefaultDockerClientConfig.createDefaultConfigBuilder();

        if (os.contains("win")) {
            configBuilder.withDockerHost("npipe:////./pipe/docker_engine");
        }

        DefaultDockerClientConfig config = configBuilder.build();

        DockerHttpClient httpClient = new ApacheDockerHttpClient.Builder()
                .dockerHost(config.getDockerHost())
                .sslConfig(config.getSSLConfig())
                .maxConnections(100)
                .connectionTimeout(Duration.ofSeconds(60))
                .responseTimeout(Duration.ofSeconds(300))
                .build();
        this.dockerClient = DockerClientImpl.getInstance(config, httpClient);
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        WebSocketMessage receivedMsg = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);

        switch (receivedMsg.type) {
            case "run" -> runCodeInDocker(session, receivedMsg.code, receivedMsg.language);
            case "analyze" -> analyzeCode(session, receivedMsg.code, receivedMsg.language);
            case "visualize" -> visualizeCode(session, receivedMsg.code, receivedMsg.language);
        }
    }

    private void visualizeCode(WebSocketSession session, String code, String language) {
        String prompt = "You are a friendly and helpful programming tutor..."
                + "\n\nHere is the " + language + " code to explain:\n```" + language + "\n"
                + code + "\n```";

        callGeminiApi(session, prompt, "flow", "flow_finished");
    }

    private void analyzeCode(WebSocketSession session, String code, String language) {
        String prompt = "As an expert code analyst..."
                + "\n\nCode to analyze:\n```" + language + "\n"
                + code + "\n```";

        callGeminiApi(session, prompt, "analysis", "analysis_finished");
    }

    private void callGeminiApi(WebSocketSession session, String prompt, String responseType, String finishedType) {
        try {
            String apiKey = System.getenv("GEMINI_API_KEY");
            if (apiKey == null || apiKey.trim().isEmpty()) {
                sendMessage(session, new ResponseMessage("error", "<h4>API Key Not Configured</h4><p>The <code>GEMINI_API_KEY</code> environment variable is not set.</p>"));
                sendMessage(session, new ResponseMessage(finishedType, ""));
                return;
            }

            String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=" + apiKey;
            String requestBody = "{\"contents\":[{\"parts\":[{\"text\": \"" + escapeJson(prompt) + "\"}]}]}";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenApply(HttpResponse::body)
                    .thenAccept(responseBody -> {
                        try {
                            ObjectMapper mapper = new ObjectMapper();
                            Map<String, Object> responseMap = mapper.readValue(responseBody, Map.class);

                            List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
                            if (candidates != null && !candidates.isEmpty()) {
                                Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                                List<Map<String, String>> parts = (List<Map<String, String>>) content.get("parts");
                                if (parts != null && !parts.isEmpty()) {
                                    String responseText = parts.get(0).get("text");

                                    if ("flow".equals(responseType)) {
                                        responseText = responseText.replace("```mermaid", "").replace("```", "").trim();
                                    }

                                    if (responseText.length() > 5000) {
                                        responseText = responseText.substring(0, 5000) + "... (truncated)";
                                    }

                                    sendMessage(session, new ResponseMessage(responseType, responseText));
                                }
                            } else {
                                sendMessage(session, new ResponseMessage("error", "<h4>API Error</h4><p>No candidates in response.</p>"));
                            }
                        } catch (Exception e) {
                            sendMessage(session, new ResponseMessage("error", "Failed to parse AI response."));
                        } finally {
                            sendMessage(session, new ResponseMessage(finishedType, ""));
                        }
                    })
                    .exceptionally(e -> {
                        sendMessage(session, new ResponseMessage("error", "Failed to call AI service: " + e.getMessage()));
                        sendMessage(session, new ResponseMessage(finishedType, ""));
                        return null;
                    });

        } catch (Exception e) {
            sendMessage(session, new ResponseMessage("error", "Error preparing AI request: " + e.getMessage()));
            sendMessage(session, new ResponseMessage(finishedType, ""));
            e.printStackTrace();
        }
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private void runCodeInDocker(WebSocketSession session, String code, String language) {
        if (language == null || language.trim().isEmpty()) {
            sendMessage(session, new ResponseMessage("error", "Execution failed: Language not specified."));
            sendMessage(session, new ResponseMessage("finished", "Process exited with code 1"));
            return;
        }

        Path tempDir = null;
        String containerId = null;
        ResultCallback.Adapter<Frame> callback = null;
        try {
            tempDir = Files.createTempDirectory("codesage-docker-");
            File buildContext = tempDir.toFile();

            String sourceFileName;
            String dockerfileResourcePath;
            switch (language.toLowerCase()) {
                case "java" -> { sourceFileName = "Main.java"; dockerfileResourcePath = "dockerfiles/java/Dockerfile"; }
                case "python" -> { sourceFileName = "script.py"; dockerfileResourcePath = "dockerfiles/python/Dockerfile"; }
                case "c" -> { sourceFileName = "script.c"; dockerfileResourcePath = "dockerfiles/c/Dockerfile"; }
                case "cpp" -> { sourceFileName = "script.cpp"; dockerfileResourcePath = "dockerfiles/cpp/Dockerfile"; }
                case "javascript" -> { sourceFileName = "script.js"; dockerfileResourcePath = "dockerfiles/javascript/Dockerfile"; }
                case "go" -> { sourceFileName = "main.go"; dockerfileResourcePath = "dockerfiles/go/Dockerfile"; }
                case "rust" -> { sourceFileName = "main.rs"; dockerfileResourcePath = "dockerfiles/rust/Dockerfile"; }
                case "typescript" -> { sourceFileName = "script.ts"; dockerfileResourcePath = "dockerfiles/typescript/Dockerfile"; }
                default -> {
                    sendMessage(session, new ResponseMessage("error", "Language not supported: " + language));
                    return;
                }
            }

            Files.writeString(tempDir.resolve(sourceFileName), code);
            ClassPathResource dockerfileResource = new ClassPathResource(dockerfileResourcePath);
            Files.copy(dockerfileResource.getInputStream(), tempDir.resolve("Dockerfile"), StandardCopyOption.REPLACE_EXISTING);

            String imageId = dockerClient.buildImageCmd(buildContext).start().awaitImageId();

            HostConfig hostConfig = new HostConfig().withMemory(256L * 1024 * 1024).withCpuCount(1L);

            CreateContainerResponse container = dockerClient.createContainerCmd(imageId).withHostConfig(hostConfig).exec();
            containerId = container.getId();
            sessionToContainerMap.put(session.getId(), containerId);

            dockerClient.startContainerCmd(containerId).exec();

            final WebSocketSession currentSession = session;
            callback = new ResultCallback.Adapter<>() {
                @Override
                public void onNext(Frame item) {
                    sendMessage(currentSession, new ResponseMessage("output", new String(item.getPayload())));
                }
            };

            dockerClient.logContainerCmd(containerId).withStdOut(true).withStdErr(true).withFollowStream(true).exec(callback);

            int exitCode = dockerClient.waitContainerCmd(containerId).start().awaitStatusCode();
            sendMessage(session, new ResponseMessage("finished", "Process exited with code " + exitCode));

            if (callback != null) callback.close();
            dockerClient.removeContainerCmd(containerId).exec();
            dockerClient.removeImageCmd(imageId).withForce(true).exec();

        } catch (Exception e) {
            sendMessage(session, new ResponseMessage("error", "Execution failed: " + e.getMessage()));
            e.printStackTrace();
        } finally {
            sessionToContainerMap.remove(session.getId());
            if (tempDir != null) {
                try {
                    Files.walk(tempDir)
                            .sorted((p1, p2) -> -p1.compareTo(p2))
                            .forEach(p -> p.toFile().delete());
                } catch (IOException e) {
                    System.err.println("Failed to delete temp directory: " + tempDir);
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        System.out.println("DEBUG: WebSocket closed. Session ID: " + session.getId());
        String containerId = sessionToContainerMap.remove(session.getId());
        if (containerId != null) {
            try {
                System.out.println("DEBUG: Force stopping container ID: " + containerId);
                dockerClient.removeContainerCmd(containerId).withForce(true).exec();
            } catch (Exception e) {
                System.err.println("Error during cleanup for session " + session.getId() + ": " + e.getMessage());
            }
        }
        super.afterConnectionClosed(session, status);
    }

    private synchronized void sendMessage(WebSocketSession session, ResponseMessage message) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
            }
        } catch (IOException e) {
            System.err.println("Error sending message: " + e.getMessage());
        }
    }
}

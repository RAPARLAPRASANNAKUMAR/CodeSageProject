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
        // --- UPDATED: Auto-detect OS for correct Docker connection ---
        String os = System.getProperty("os.name").toLowerCase();
        DefaultDockerClientConfig.Builder configBuilder = DefaultDockerClientConfig.createDefaultConfigBuilder();

        if (os.contains("win")) {
            // If on Windows, connect to Docker Desktop via the named pipe
            configBuilder.withDockerHost("npipe:////./pipe/docker_engine");
        }
        // For Linux (like on Render) or Mac, the default ("unix:///var/run/docker.sock") is correct.
        
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

        if ("run".equals(receivedMsg.type)) {
            runCodeInDocker(session, receivedMsg.code, receivedMsg.language);
        } else if ("analyze".equals(receivedMsg.type)) {
            analyzeCode(session, receivedMsg.code, receivedMsg.language);
        } else if ("visualize".equals(receivedMsg.type)) {
            visualizeCode(session, receivedMsg.code, receivedMsg.language);
        }
    }

    private void visualizeCode(WebSocketSession session, String code, String language) {
        String prompt = "You are a friendly and helpful programming tutor. Your task is to explain the execution of a piece of code to a beginner. "
                + "Describe the code's journey step-by-step, as if you were telling a story. "
                + "Your response must be a single, clean block of HTML. "
                + "Use <h4> for headings for each major step (e.g., 'Step 1: Setting Things Up'). "
                + "Use <p> for your explanations. "
                + "Use <code> tags to highlight variable names and their values (e.g., 'the variable <code>count</code> is now <code>5</code>'). "
                + "Do not use markdown. The entire response should be compact and easy to read."
                + "\n\nHere is the " + language + " code to explain:\n```" + language + "\n"
                + code + "\n```";

        callGeminiApi(session, prompt, "flow", "flow_finished");
    }

    private void analyzeCode(WebSocketSession session, String code, String language) {
        String prompt = "As an expert code analyst, provide a concise complexity analysis for the following " + language + " code. "
                + "Your response must be a single, clean block of HTML. "
                + "Use <h4> for headings (e.g., 'Time Complexity'). "
                + "Use <p> for explanations. "
                + "Use <code> for Big O notation and code snippets. "
                + "If the provided code is not optimal, you MUST include a section with the heading <h4>Optimal Approach</h4>. "
                + "In this section, explain the better approach in words and provide its Time and Space Complexity. **Do not provide the full optimized code snippet.** "
                + "Do not use markdown. Ensure there are no extra line breaks or spacing between HTML elements. The entire response should be compact and ready to be injected directly into a div."
                + "\n\nCode to analyze:\n```" + language + "\n"
                + code + "\n```";
        
        callGeminiApi(session, prompt, "analysis", "analysis_finished");
    }

    private void callGeminiApi(WebSocketSession session, String prompt, String responseType, String finishedType) {
         try {
            String apiKey = System.getenv("GEMINI_API_KEY");
            if (apiKey == null || apiKey.trim().isEmpty()) {
                sendMessage(session, new ResponseMessage("error", "<h4>API Key Not Configured</h4><p>The <code>GEMINI_API_KEY</code> environment variable is not set on the server.</p>"));
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
                        
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
                        if (candidates != null && !candidates.isEmpty()) {
                            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                            @SuppressWarnings("unchecked")
                            List<Map<String, String>> parts = (List<Map<String, String>>) content.get("parts");
                            if (parts != null && !parts.isEmpty()) {
                                String responseText = parts.get(0).get("text");
                                sendMessage(session, new ResponseMessage(responseType, responseText));
                            }
                        } else {
                            sendMessage(session, new ResponseMessage("error", "<h4>API Error</h4><p>Response: <code>" + escapeJson(responseBody) + "</code></p>"));
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
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\b", "\\b").replace("\f", "\\f").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    private void runCodeInDocker(WebSocketSession session, String code, String language) {
        if (language == null || language.trim().isEmpty()) {
            sendMessage(session, new ResponseMessage("error", "Execution failed: Language was not specified."));
            sendMessage(session, new ResponseMessage("finished", "Process exited with code 1"));
            return;
        }

        Path tempDir = null;
        String containerId = null;
        try {
            tempDir = Files.createTempDirectory("codesage-docker-");
            File buildContext = tempDir.toFile();

            String sourceFileName;
            String dockerfileResourcePath;
            switch (language.toLowerCase()) {
                case "java": sourceFileName = "Main.java"; dockerfileResourcePath = "dockerfiles/java/Dockerfile"; break;
                case "python": sourceFileName = "script.py"; dockerfileResourcePath = "dockerfiles/python/Dockerfile"; break;
                case "c": sourceFileName = "script.c"; dockerfileResourcePath = "dockerfiles/c/Dockerfile"; break;
                case "cpp": sourceFileName = "script.cpp"; dockerfileResourcePath = "dockerfiles/cpp/Dockerfile"; break;
                case "javascript": sourceFileName = "script.js"; dockerfileResourcePath = "dockerfiles/javascript/Dockerfile"; break;
                case "go": sourceFileName = "main.go"; dockerfileResourcePath = "dockerfiles/go/Dockerfile"; break;
                case "rust": sourceFileName = "main.rs"; dockerfileResourcePath = "dockerfiles/rust/Dockerfile"; break;
                case "typescript": sourceFileName = "script.ts"; dockerfileResourcePath = "dockerfiles/typescript/Dockerfile"; break;
                default: sendMessage(session, new ResponseMessage("error", "Language not supported: " + language)); return;
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

            dockerClient.logContainerCmd(containerId).withStdOut(true).withStdErr(true).withFollowStream(true)
                    .exec(new ResultCallback.Adapter<Frame>() {
                        @Override
                        public void onNext(Frame item) {
                            sendMessage(session, new ResponseMessage("output", new String(item.getPayload())));
                        }
                    });

            int exitCode = dockerClient.waitContainerCmd(containerId).start().awaitStatusCode();
            sendMessage(session, new ResponseMessage("finished", "Process exited with code " + exitCode));
            
            dockerClient.removeContainerCmd(containerId).exec();
            dockerClient.removeImageCmd(imageId).withForce(true).exec();

        } catch (Exception e) {
            sendMessage(session, new ResponseMessage("error", "Execution failed: " + e.getMessage()));
            e.printStackTrace();
        } finally {
            sessionToContainerMap.remove(session.getId());
            if (tempDir != null) {
                try {
                    Files.walk(tempDir).sorted((p1, p2) -> -p1.compareTo(p2)).forEach(p -> p.toFile().delete());
                } catch (IOException e) {
                   System.err.println("Failed to delete temp directory: " + tempDir);
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        System.out.println("DEBUG: WebSocket connection closed. Session ID: " + session.getId() + ", Status: " + status);
        String containerId = sessionToContainerMap.remove(session.getId());
        if (containerId != null) {
            try {
                System.out.println("DEBUG: Force stopping and removing container ID: " + containerId);
                dockerClient.removeContainerCmd(containerId).withForce(true).exec();
            } catch (Exception e) {
                System.err.println("Error during container cleanup for session " + session.getId() + ": " + e.getMessage());
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
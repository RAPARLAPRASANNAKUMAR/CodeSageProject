package com.codesage.codesage_backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class CodeWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Process> sessionToProcessMap = new ConcurrentHashMap<>();
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
        // No Docker client initialization is needed.
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        WebSocketMessage receivedMsg = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);

        if ("run".equals(receivedMsg.type)) {
            runCode(session, receivedMsg.code, receivedMsg.language);
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

    private void runCode(WebSocketSession session, String code, String language) throws IOException {
        if (language == null || language.trim().isEmpty()) {
            sendMessage(session, new ResponseMessage("error", "Language not specified."));
            return;
        }

        Path tempDir = Files.createTempDirectory("codesage-exec-");
        
        switch (language.toLowerCase()) {
            case "python":
                executeSimple(session, tempDir, "script.py", code, "python3", "-u");
                break;
            case "javascript":
                executeSimple(session, tempDir, "script.js", code, "node");
                break;
            case "java":
                executeCompiled(session, tempDir, "Main.java", code, "Main", "javac", "java", "-cp", ".");
                break;
            case "c":
                executeCompiled(session, tempDir, "script.c", code, "a.out", "gcc", "./a.out");
                break;
            case "cpp":
                executeCompiled(session, tempDir, "script.cpp", code, "a.out", "g++", "./a.out");
                break;
            case "go":
                executeSimple(session, tempDir, "main.go", code, "go", "run");
                break;
            case "rust":
                executeCompiled(session, tempDir, "main.rs", code, "main", "rustc", "./main");
                break;
            case "typescript":
                executeCompiled(session, tempDir, "script.ts", code, "script.js", "tsc", "node");
                break;
            default:
                sendMessage(session, new ResponseMessage("error", "Language not supported for execution."));
                Files.delete(tempDir);
                return;
        }
    }

    private void executeSimple(WebSocketSession session, Path tempDir, String fileName, String code, String... command) throws IOException {
        Path sourceFile = tempDir.resolve(fileName);
        Files.writeString(sourceFile, code);

        List<String> commandList = new ArrayList<>(Arrays.asList(command));
        commandList.add(sourceFile.toAbsolutePath().toString());
        
        ProcessBuilder pb = new ProcessBuilder(commandList);
        executeProcess(session, pb, tempDir);
    }

    private void executeCompiled(WebSocketSession session, Path tempDir, String sourceName, String code, String outputName, String compiler, String executor, String... execArgs) throws IOException {
        Path sourceFile = tempDir.resolve(sourceName);
        Files.writeString(sourceFile, code);
        
        Path outputFile = tempDir.resolve(outputName);

        ProcessBuilder compilePb;
        if (compiler.equals("javac")) {
            compilePb = new ProcessBuilder(compiler, sourceFile.toAbsolutePath().toString());
        } else {
            compilePb = new ProcessBuilder(compiler, sourceFile.toAbsolutePath().toString(), "-o", outputFile.toAbsolutePath().toString());
        }
        
        try {
            Process compileProcess = compilePb.start();
            int exitCode = compileProcess.waitFor();
            if (exitCode != 0) {
                String errorOutput = new String(compileProcess.getErrorStream().readAllBytes());
                sendMessage(session, new ResponseMessage("error", "Compilation failed:\n" + errorOutput));
                sendMessage(session, new ResponseMessage("finished", "Process exited with code " + exitCode));
                return;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            sendMessage(session, new ResponseMessage("error", "Compilation was interrupted."));
            return;
        }
        
        List<String> execCommandList = new ArrayList<>();
        execCommandList.add(executor);
        execCommandList.addAll(Arrays.asList(execArgs));
        execCommandList.add(executor.equals("node") ? outputFile.toAbsolutePath().toString() : outputName);

        ProcessBuilder executePb = new ProcessBuilder(execCommandList);
        executePb.directory(tempDir.toFile());
        executeProcess(session, pb, tempDir);
    }

    private void executeProcess(WebSocketSession session, ProcessBuilder pb, Path tempDir) {
        try {
            Process process = pb.start();
            sessionToProcessMap.put(session.getId(), process);

            startStreamReader(session, process.getInputStream(), "output");
            startStreamReader(session, process.getErrorStream(), "error");

            new Thread(() -> {
                try {
                    int exitCode = process.waitFor();
                    sendMessage(session, new ResponseMessage("finished", "Process exited with code " + exitCode));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    cleanupSession(session.getId());
                    try {
                        Files.walk(tempDir).sorted((p1, p2) -> -p1.compareTo(p2)).forEach(p -> p.toFile().delete());
                    } catch (IOException e) {
                        System.err.println("Failed to delete temp directory: " + tempDir);
                    }
                }
            }).start();
        } catch (IOException e) {
             sendMessage(session, new ResponseMessage("error", "Execution failed: " + e.getMessage()));
             e.printStackTrace();
        }
    }


    private void startStreamReader(WebSocketSession session, InputStream inputStream, String type) {
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sendMessage(session, new ResponseMessage(type, line + "\n"));
                }
            } catch (IOException e) {
                // This can happen when the process is killed.
            }
        }).start();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        System.out.println("DEBUG: WebSocket connection closed. Session ID: " + session.getId() + ", Status: " + status);
        cleanupSession(session.getId());
        super.afterConnectionClosed(session, status);
    }
    
    private void cleanupSession(String sessionId) {
        Process process = sessionToProcessMap.remove(sessionId);
        if (process != null && process.isAlive()) {
            process.destroyForcibly();
        }
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
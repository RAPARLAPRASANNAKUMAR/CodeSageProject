// src/main/java/com/codesage/codesage_backend/WebSocketConfig.java

package com.codesage.codesage_backend;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final CodeWebSocketHandler codeWebSocketHandler;

    // Spring injects our handler here
    public WebSocketConfig(CodeWebSocketHandler codeWebSocketHandler) {
        this.codeWebSocketHandler = codeWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Map the handler to the "/code-socket" endpoint
        // Allow requests from your React app's origin
        registry.addHandler(codeWebSocketHandler, "/code-socket")
                .setAllowedOrigins("http://localhost:3000");
    }
}
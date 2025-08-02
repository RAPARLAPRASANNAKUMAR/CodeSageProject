package com.codesage.codesage_backend;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final CodeWebSocketHandler codeWebSocketHandler;

    public WebSocketConfig(CodeWebSocketHandler codeWebSocketHandler) {
        this.codeWebSocketHandler = codeWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(codeWebSocketHandler, "/code-socket")
                // This line allows your Vercel frontend to connect to your Render backend
                .setAllowedOrigins("https://code-sage-project-hgsb-28quy7zl2.vercel.app", "http://localhost:3000");
    }
}
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";
import { Card, Space, Typography } from "antd";
import PlayerRatings from "./lobby/PlayerRatings";
import LobbyGameSelector from "./lobby/LobbyGameSelector";
import MatchmakingStatus from "./lobby/MatchmakingStatus";
import { buildHttpApiBaseUrl, buildWsHostBaseUrl } from "../utils/url"; // Типы сообщений от WebSocket сервера

// Типы сообщений от WebSocket сервера
interface WsMessage {
  type: "in_queue" | "match_found" | "error" | string;
  pool?: string;
  game_id?: string;
  color?: "white" | "black";
  anon_id?: string;
  username?: string;
  message?: string;
}

interface JoinPoolData {
  game_type: string;
  time_control: string;
  rated: boolean;
}

const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("lobby");
  const { user, token, refreshUser } = useAuth();
  const routeLocation = useLocation();

  const [inQueue, setInQueue] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [currentGameType, setCurrentGameType] = useState<string>("pentago");
  const wsRef = useRef<WebSocket | null>(null);

  // Читаем переменные окружения с типами (благодаря env.d.ts)
  const httpApiUrl = buildHttpApiBaseUrl();

  // Check for active game on component mount
  useEffect(() => {
    const checkActiveGame = async () => {
      if (!token) return;

      try {
        await fetch(`${httpApiUrl}/auth/me/active-game`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const response = await fetch(`${httpApiUrl}/auth/me/active-game`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.active_game_id) {
            // User has an active game, redirect to it
            // For now, we'll let the GameClient determine the game type from WebSocket
            // But we should ideally get the game type from the API
            navigate(`/game/${data.active_game_id}`);
          }
        }
      } catch (error) {
        console.error("Failed to check active game:", error);
      }
    };

    checkActiveGame();
  }, [token, navigate, httpApiUrl]);

  useEffect(() => {
    if (!token) return;
    refreshUser().catch((error) => {
      console.error("Failed to refresh user profile:", error);
    });
  }, [routeLocation.pathname, token, refreshUser]);

  const joinQueue = (
    gameType: string = "pentago",
    timeControl: string = "3+0",
    rated: boolean = true,
  ) => {
    if (!token && rated) {
      alert(t("loginRequired"));
      navigate("/login");
      return;
    }

    setCurrentGameType(gameType);
    setInQueue(true);
    setStatus(t("joiningQueue"));

    const wsBaseUrl = buildWsHostBaseUrl();
    const wsUrl = `${wsBaseUrl}/api/ws/matchmaking${token ? `?token=${token}` : ""}`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      const payload: { type: "join_pool"; data: JoinPoolData } = {
        type: "join_pool",
        data: {
          game_type: gameType,
          time_control: timeControl,
          rated,
        },
      };
      wsRef.current?.send(JSON.stringify(payload));
    };

    wsRef.current.onmessage = (event: MessageEvent) => {
      console.log("Lobby WS message:", event.data);
      let msg: WsMessage;
      try {
        msg = JSON.parse(event.data) as WsMessage;
      } catch {
        console.error("Invalid JSON from WS");
        return;
      }

      switch (msg.type) {
        case "in_queue":
          setStatus(t("inQueue"));
          break;

        case "match_found":
          console.log("Match found:", {
            gameId: msg.game_id,
            color: msg.color,
            currentGameType,
          });
          setStatus(t("matchFound"));
          setInQueue(false);
          if (msg.game_id && msg.anon_id) {
            sessionStorage.setItem(
              `anon_game_${msg.game_id}`,
              JSON.stringify({
                anonId: msg.anon_id,
                anonName: msg.username || "",
              }),
            );
          }
          navigate(`/game/${msg.game_id}`, {
            state: {
              color: msg.color,
              gameType: currentGameType,
              anonId: msg.anon_id,
              anonName: msg.username,
            },
          });
          wsRef.current?.close();
          break;

        case "error":
          setStatus(msg.message || t("unknownError"));
          setInQueue(false);
          break;

        default:
          console.log("Unknown message type:", msg.type);
      }
    };

    wsRef.current.onclose = () => {
      if (inQueue) {
        setInQueue(false);
        setStatus(t("connectionClosed"));
      }
    };

    wsRef.current.onerror = () => {
      setStatus(t("connectionError"));
      setInQueue(false);
    };
  };

  const leaveQueue = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "leave_pool" }));
      wsRef.current.close();
    }
    setInQueue(false);
    setStatus("");
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <MatchmakingStatus
        inQueue={inQueue}
        status={status}
        onLeaveQueue={leaveQueue}
      />

      {!inQueue && (
        <>
          <Typography.Title level={2}>{t("matchmaking")}</Typography.Title>

          <Card>
            <Typography.Text strong>
              {t("welcome")}, {user?.username || t("guest")}!
            </Typography.Text>
            <PlayerRatings user={user} />
          </Card>

          <LobbyGameSelector user={user} onJoinQueue={joinQueue} />
        </>
      )}
    </Space>
  );
};

export default Lobby;

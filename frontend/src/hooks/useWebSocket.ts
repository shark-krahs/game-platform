import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Location, NavigateFunction } from "react-router-dom";
import { ChatMessage, GameStatus, Player, User } from "../types";
import { buildWsApiBaseUrl } from "../utils/url";

interface TetrisBoardState {
  grid: number[][];
  width: number;
  height: number;
  next_pieces: string[];
  scores: number[];
}

interface UseWebSocketReturn {
  connected: boolean;
  status: GameStatus | "disconnected";
  error: string | null;

  board: (number | null)[][] | null;
  board_state: TetrisBoardState | null;
  game_type: string;
  players: Player[];
  turn: number;
  current_player: number;
  winner: string | null;
  resetVotes: number[];
  firstMoveTimer: number;
  firstMovePlayer: number | null;
  disconnectTimer: number;
  disconnectedPlayer: number | null;

  messages: string[];
  chatMessages: ChatMessage[];

  sendMessage: (message: any) => void;
  disconnect: () => void;
}

export function useWebSocket(
  gameId: string | undefined,
  authToken: string | null,
  user: User | null,
  navigate: NavigateFunction,
  location: Location,
): UseWebSocketReturn {
  const { t } = useTranslation("gameClient");

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [board, setBoard] = useState<(number | null)[][] | null>(null);
  const [board_state, setBoardState] = useState<TetrisBoardState | null>(null);
  const [game_type, setGameType] = useState<string>("pentago");
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<GameStatus | "disconnected">(
    "disconnected",
  );
  const [turn, setTurn] = useState(0);
  const [current_player, setCurrentPlayer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [resetVotes, setResetVotes] = useState<number[]>([]);
  const [firstMoveTimer, setFirstMoveTimer] = useState(0);
  const [firstMovePlayer, setFirstMovePlayer] = useState<number | null>(null);
  const [disconnectTimer, setDisconnectTimer] = useState(0);
  const [disconnectedPlayer, setDisconnectedPlayer] = useState<number | null>(
    null,
  );

  const connectedRef = useRef(false);

  const connectToGame = useCallback(
    (game_id: string) => {
      if (connectedRef.current) {
        console.log("Already connected, skipping reconnect");
        return;
      }
      connectedRef.current = true;

      const wsBaseUrl = buildWsApiBaseUrl();
      const wsUrl = `${wsBaseUrl}/ws/game/${game_id}${authToken ? `?token=${authToken}` : ""}`;

      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("GameClient WS connected");
        setConnected(true);
        setStatus("playing");
        setError(null);
        setMessages((m) => [...m, t("connected")]);
      };

      socket.onmessage = (ev: MessageEvent) => {
        console.log("GameClient WS message:", ev.data);
        try {
          const msg = JSON.parse(ev.data) as any;

          if (msg.type === "state") {
            setBoard(msg.board || null);
            setBoardState(msg.board_state || null);
            setGameType(msg.game_type || "pentago");
            setPlayers(msg.players || []);
            setStatus(msg.status || "playing");
            setTurn(msg.current_player ?? 0);
            setCurrentPlayer(msg.current_player ?? 0);
            setResetVotes(msg.reset_votes || []);
            setWinner(msg.winner ?? null);
            setFirstMoveTimer(msg.first_move_timer ?? 0);
            setFirstMovePlayer(
              msg.first_move_player !== undefined
                ? msg.first_move_player
                : null,
            );
            setDisconnectTimer(msg.disconnect_timer ?? 0);
            setDisconnectedPlayer(
              msg.disconnected_player !== undefined
                ? msg.disconnected_player
                : null,
            );
            if (Array.isArray(msg.chat)) {
              setChatMessages(msg.chat);
            }
            setError(null);
          } else if (msg.type === "chat") {
            if (msg.chat) {
              setChatMessages((prev) => [...prev, msg.chat]);
            }
          } else if (msg.type === "error") {
            console.warn("Game error:", msg.message);
            const localizedError = msg.code
              ? t(msg.code, { defaultValue: "" })
              : "";
            const errorMessage = localizedError || msg.message;
            if (msg.code === "games.room_full" || msg.message === "room full") {
              alert(t("roomFull"));
              navigate("/lobby");
              return;
            }
            setError(errorMessage);
            setMessages((m) => [...m, `${t("error")}: ${errorMessage}`]);
          } else {
            console.log("Unhandled message type:", msg.type);
            setMessages((m) => [...m, ev.data]);
          }
        } catch (e) {
          console.error("Failed to parse WS message:", ev.data, e);
          setMessages((m) => [...m, ev.data]);
        }
      };

      socket.onclose = () => {
        connectedRef.current = false;
        setConnected(false);
        setStatus("disconnected");
        setMessages((m) => [...m, t("disconnected")]);
      };

      socket.onerror = () => {
        connectedRef.current = false;
        setError(t("connectionError"));
        setTimeout(() => navigate("/lobby"), 3000);
      };

      setWs(socket);
    },
    [authToken, user, navigate, t],
  );

  const sendMessage = useCallback(
    (message: any) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      } else {
        console.warn("Cannot send message: WebSocket not open");
      }
    },
    [ws],
  );

  const disconnect = useCallback(() => {
    if (ws) {
      ws.close();
    }
  }, [ws]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Автоподключение при наличии gameId
  useEffect(() => {
    if (gameId && !ws && !connectedRef.current) {
      connectToGame(gameId);
    } else if (!gameId && connected) {
      disconnect();
      navigate("/lobby");
    }
  }, [gameId, ws, connectToGame, navigate, connected, disconnect]);

  return {
    connected,
    status,
    error,

    board,
    board_state,
    game_type,
    players,
    turn,
    current_player,
    winner,
    resetVotes,
    firstMoveTimer,
    firstMovePlayer,
    disconnectTimer,
    disconnectedPlayer,

    messages,
    chatMessages,

    sendMessage,
    disconnect,
  };
}

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface StockTick {
  symbol: string;
  lastPrice: string;
  volume: number;
  timestamp: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/market',
})
export class MarketWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarketWebSocketGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`[Market WS] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[Market WS] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() symbol: string,
  ) {
    client.join(`ticker-${symbol}`);
    return { event: 'subscribed', data: symbol };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() symbol: string,
  ) {
    client.leave(`ticker-${symbol}`);
    return { event: 'unsubscribed', data: symbol };
  }

  /** Called directly by MarketDataService on each 500ms tick */
  broadcastTick(tick: StockTick) {
    this.server.to(`ticker-${tick.symbol}`).emit('tick', tick);
  }
}
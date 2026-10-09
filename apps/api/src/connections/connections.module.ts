import { Module } from '@nestjs/common';
import { ConnectionAttempts } from './attempts';
import { BlueskyOAuthController } from './bluesky/bluesky-oauth.controller';
import { BlueskyConnector } from './bluesky/bluesky.connector';
import { BlueskyStores } from './bluesky/bluesky.stores';
import { ConnectionContext } from './connection-context';
import { ConnectionsCallbackController } from './connections-callback.controller';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { CHANNEL_CONNECTORS, type ChannelConnector } from './connector';
import { MastodonApps } from './mastodon/mastodon.apps';
import { MastodonConnector } from './mastodon/mastodon.connector';
import { MastodonStore } from './mastodon/mastodon.store';

@Module({
  controllers: [
    ConnectionsController,
    ConnectionsCallbackController,
    BlueskyOAuthController,
  ],
  providers: [
    ConnectionsService,
    ConnectionContext,
    ConnectionAttempts,
    BlueskyStores,
    BlueskyConnector,
    MastodonApps,
    MastodonStore,
    MastodonConnector,
    {
      provide: CHANNEL_CONNECTORS,
      // 채널을 늘릴 때 이 목록에 커넥터를 더한다.
      useFactory: (
        bluesky: BlueskyConnector,
        mastodon: MastodonConnector
      ): ChannelConnector[] => [bluesky, mastodon],
      inject: [BlueskyConnector, MastodonConnector],
    },
  ],
})
export class ConnectionsModule {}

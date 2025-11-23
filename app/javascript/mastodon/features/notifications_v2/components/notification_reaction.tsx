import { FormattedMessage } from 'react-intl';

import { Link } from 'react-router-dom';

import MoodIcon from '@/material-icons/400-24px/mood.svg?react';
import type { NotificationGroupReaction } from 'mastodon/models/notification_group';
import { unicodeMapping } from 'mastodon/features/emoji/emoji_unicode_mapping_light';
import { autoPlayGif } from 'mastodon/initial_state';
import { useAppSelector } from 'mastodon/store';
import { assetHost } from 'mastodon/utils/config';

import type { LabelRenderer } from './notification_group_with_status';
import { NotificationGroupWithStatus } from './notification_group_with_status';

interface ReactionEmojiProps {
  name: string;
  url?: string;
  staticUrl?: string;
}

const ReactionEmoji: React.FC<ReactionEmojiProps> = ({ name, url, staticUrl }) => {
  if (unicodeMapping[name]) {
    const { filename, shortCode } = unicodeMapping[name];
    const title = shortCode ? `:${shortCode}:` : '';

    return (
      <img
        draggable='false'
        className='emojione'
        alt={name}
        title={title}
        src={`${assetHost}/emoji/${filename}.svg`}
      />
    );
  } else if (url && staticUrl) {
    const filename = autoPlayGif ? url : staticUrl;
    const shortCode = `:${name}:`;

    return (
      <img
        draggable='false'
        className='emojione custom-emoji'
        alt={shortCode}
        title={shortCode}
        src={filename}
      />
    );
  }
  return null;
};

const labelRenderer: LabelRenderer = (displayedName, total, seeMoreHref) => {
  if (total === 1)
    return (
      <FormattedMessage
        id='notification.reaction'
        defaultMessage='{name} reacted to your post'
        values={{ name: displayedName }}
      />
    );

  return (
    <FormattedMessage
      id='notification.reaction.name_and_others_with_link'
      defaultMessage='{name} and <a>{count, plural, one {# other} other {# others}}</a> reacted to your post'
      values={{
        name: displayedName,
        count: total - 1,
        a: (chunks) =>
          seeMoreHref ? <Link to={seeMoreHref}>{chunks}</Link> : chunks,
      }}
    />
  );
};

export const NotificationReaction: React.FC<{
  notification: NotificationGroupReaction;
  unread: boolean;
}> = ({ notification, unread }) => {
  const { statusId, sampleReactions } = notification;
  const statusAccount = useAppSelector(
    (state: any) =>
      state.accounts.get(state.statuses.getIn([statusId, 'account']) as string)
        ?.acct,
  );

  const customEmojis = useAppSelector((state: any) => state.custom_emojis);

  const reactionEmojis = sampleReactions.map((reaction) => {
    if (reaction.customEmojiId) {
      const customEmoji = customEmojis.find((e: any) => e.shortcode === reaction.name);
      return (
        <ReactionEmoji
          key={reaction.name}
          name={reaction.name}
          url={customEmoji?.url}
          staticUrl={customEmoji?.static_url}
        />
      );
    }
    return (
      <ReactionEmoji
        key={reaction.name}
        name={reaction.name}
      />
    );
  });

  const additionalContent = sampleReactions.length > 0 ? (
    <div className='notification-group__embedded-status__reactions'>
      {reactionEmojis}
    </div>
  ) : undefined;

  return (
    <NotificationGroupWithStatus
      type='reaction'
      icon={MoodIcon}
      iconId='mood'
      accountIds={notification.sampleAccountIds}
      statusId={notification.statusId}
      timestamp={notification.latest_page_notification_at}
      count={notification.notifications_count}
      labelRenderer={labelRenderer}
      labelSeeMoreHref={
        statusAccount ? `/@${statusAccount}/${statusId}` : undefined
      }
      unread={unread}
      additionalContent={additionalContent}
    />
  );
};

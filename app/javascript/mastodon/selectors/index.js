import { List as ImmutableList, Map as ImmutableMap } from 'immutable';
import { createSelector } from 'reselect';

import { toServerSideType } from 'mastodon/utils/filters';

import { me } from '../initial_state';

const getAccountBase         = (state, id) => state.getIn(['accounts', id], null);
const getAccountCounters     = (state, id) => state.getIn(['accounts_counters', id], null);
const getAccountRelationship = (state, id) => state.getIn(['relationships', id], null);
const getAccountMoved        = (state, id) => state.getIn(['accounts', state.getIn(['accounts', id, 'moved'])]);

export const makeGetAccount = () => {
  return createSelector([getAccountBase, getAccountCounters, getAccountRelationship, getAccountMoved], (base, counters, relationship, moved) => {
    if (base === null) {
      return null;
    }

    return base.merge(counters).withMutations(map => {
      map.set('relationship', relationship);
      map.set('moved', moved);
    });
  });
};

const getFilters = (state, { contextType }) => {
  if (!contextType) return null;

  const serverSideType = toServerSideType(contextType);
  const now = new Date();

  return state.get('filters').filter((filter) => filter.get('context').includes(serverSideType) && (filter.get('expires_at') === null || filter.get('expires_at') > now));
};

export const makeGetStatus = () => {
  return createSelector(
    [
      (state, { id }) => state.getIn(['statuses', id]),
      (state, { id }) => state.getIn(['statuses', state.getIn(['statuses', id, 'reblog'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['statuses', id, 'account'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['statuses', state.getIn(['statuses', id, 'reblog']), 'account'])]),
      (state, { id }) => state.getIn(['statuses', id, 'reactions'])?.flatMap(reaction => reaction.get('users')).map(user => state.getIn(['accounts', user.get('id')])),
      (state, { id }) => state.getIn(['statuses', state.getIn(['statuses', id, 'reblog']), 'reactions'])?.flatMap(reaction => reaction.get('users')).map(user => state.getIn(['accounts', user.get('id')])),
      getFilters,
    ],

    (statusBase, statusReblog, accountBase, accountReblog, reactedUsers, reactedUsersReblog, filters) => {
      if (!statusBase || statusBase.get('isLoading')) {
        return null;
      }

      if (statusReblog) {
        statusReblog = statusReblog.set('account', accountReblog);
      } else {
        statusReblog = null;
      }

      let filtered = false;
      if ((accountReblog || accountBase).get('id') !== me && filters) {
        let filterResults = statusReblog?.get('filtered') || statusBase.get('filtered') || ImmutableList();
        if (filterResults.some((result) => filters.getIn([result.get('filter'), 'filter_action']) === 'hide')) {
          return null;
        }
        filterResults = filterResults.filter(result => filters.has(result.get('filter')));
        if (!filterResults.isEmpty()) {
          filtered = filterResults.map(result => filters.getIn([result.get('filter'), 'title']));
        }
      }

      let reactions = statusReblog
        ? statusReblog.get('reactions')
        : statusBase.get('reactions');
      let users = statusReblog
        ? reactedUsersReblog
        : reactedUsers;
      if (reactions && users) {
        let userIndex = 0;
        for (let i = 0; i < reactions.size; i++) {
          for(let j = 0; j < reactions.getIn([i, 'users']).size; j++) {
            reactions = reactions.setIn([i, 'users', j], users.get(userIndex++));
          }
        }
      }

      if (statusReblog) {
        statusReblog = statusReblog.set('reactions', reactions);
      }

      return statusBase.withMutations(map => {
        map.set('reblog', statusReblog);
        map.set('account', accountBase);
        map.set('matched_filters', filtered);
        if (!statusReblog) {
          map.set('reactions', reactions);
        }
      });
    },
  );
};

export const makeGetPictureInPicture = () => {
  return createSelector([
    (state, { id }) => state.get('picture_in_picture').statusId === id,
    (state) => state.getIn(['meta', 'layout']) !== 'mobile',
  ], (inUse, available) => ImmutableMap({
    inUse: inUse && available,
    available,
  }));
};

const ALERT_DEFAULTS = {
  dismissAfter: 5000,
  style: false,
};

export const getAlerts = createSelector(state => state.get('alerts'), alerts =>
  alerts.map(item => ({
    ...ALERT_DEFAULTS,
    ...item,
  })).toArray());

export const makeGetNotification = () => createSelector([
  (_, base)             => base,
  (state, _, accountId) => state.getIn(['accounts', accountId]),
], (base, account) => base.set('account', account));

export const makeGetReport = () => createSelector([
  (_, base) => base,
  (state, _, targetAccountId) => state.getIn(['accounts', targetAccountId]),
], (base, targetAccount) => base.set('target_account', targetAccount));

export const getAccountGallery = createSelector([
  (state, id) => state.getIn(['timelines', `account:${id}:media`, 'items'], ImmutableList()),
  state       => state.get('statuses'),
  (state, id) => state.getIn(['accounts', id]),
], (statusIds, statuses, account) => {
  let medias = ImmutableList();

  statusIds.forEach(statusId => {
    const status = statuses.get(statusId).set('account', account);
    medias = medias.concat(status.get('media_attachments').map(media => media.set('status', status)));
  });

  return medias;
});

export const getAccountHidden = createSelector([
  (state, id) => state.getIn(['accounts', id, 'hidden']),
  (state, id) => state.getIn(['relationships', id, 'following']) || state.getIn(['relationships', id, 'requested']),
  (state, id) => id === me,
], (hidden, followingOrRequested, isSelf) => {
  return hidden && !(isSelf || followingOrRequested);
});

export const getStatusList = createSelector([
  (state, type) => state.getIn(['status_lists', type, 'items']),
], (items) => items.toList());

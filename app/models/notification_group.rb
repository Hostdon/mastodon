# frozen_string_literal: true

class NotificationGroup < ActiveModelSerializers::Model
  attributes :group_key, :sample_accounts, :notifications_count, :notification, :most_recent_notification_id, :pagination_data

  # Try to keep this consistent with `app/javascript/mastodon/models/notification_group.ts`
  SAMPLE_ACCOUNTS_SIZE = 8

  def self.from_notifications(notifications, pagination_range: nil, grouped_types: nil)
    return [] if notifications.empty?

    # Map emoji_reaction to reaction for frontend compatibility
    grouped_types = grouped_types.presence&.map { |type| type.to_sym == :emoji_reaction ? :reaction : type.to_sym } || Notification::GROUPABLE_NOTIFICATION_TYPES

    grouped_notifications = notifications.filter { |notification| notification.group_key.present? && grouped_types.include?(notification.type) }
    group_keys = grouped_notifications.pluck(:group_key)

    groups_data = load_groups_data(notifications.first.account_id, group_keys, pagination_range: pagination_range)
    accounts_map = Account.where(id: groups_data.values.pluck(1).flatten).index_by(&:id)

    notifications.map do |notification|
      if notification.group_key.present? && grouped_types.include?(notification.type)
        most_recent_notification_id, sample_account_ids, count, *raw_pagination_data = groups_data[notification.group_key]

        pagination_data = raw_pagination_data.empty? ? nil : { min_id: raw_pagination_data[0], latest_notification_at: raw_pagination_data[1] }

        NotificationGroup.new(
          notification: notification,
          group_key: notification.group_key,
          sample_accounts: sample_account_ids.map { |id| accounts_map[id] },
          notifications_count: count,
          most_recent_notification_id: most_recent_notification_id,
          pagination_data: pagination_data
        )
      else
        pagination_data = pagination_range.blank? ? nil : { min_id: notification.id, latest_notification_at: notification.created_at }

        NotificationGroup.new(
          notification: notification,
          group_key: "ungrouped-#{notification.id}",
          sample_accounts: [notification.from_account],
          notifications_count: 1,
          most_recent_notification_id: notification.id,
          pagination_data: pagination_data
        )
      end
    end
  end

  delegate :type,
           :target_status,
           :report,
           :account_relationship_severance_event,
           :account_warning,
           :generated_annual_report,
           to: :notification, prefix: false

  def sample_reactions
    return [] unless notification.type == :reaction

    # Get the most recent reactions from the group
    results = Reaction
      .joins('INNER JOIN notifications ON notifications.activity_id = reactions.id AND notifications.activity_type = \'Reaction\'')
      .where(notifications: { account_id: notification.account_id, group_key: group_key })
      .order('notifications.id DESC')
      .limit(3)
      .pluck(:name, :custom_emoji_id)
      .map { |name, custom_emoji_id| { name: name, custom_emoji_id: custom_emoji_id } }

    # Remove duplicates based on name
    results.uniq { |r| r[:name] }
  end

  class << self
    private

    def load_groups_data(account_id, group_keys, pagination_range: nil)
      return {} if group_keys.empty?

      if pagination_range.present?
        binds = [
          account_id,
          SAMPLE_ACCOUNTS_SIZE,
          ActiveRecord::Relation::QueryAttribute.new('group_keys', group_keys, ActiveRecord::ConnectionAdapters::PostgreSQL::OID::Array.new(ActiveModel::Type::String.new)),
          pagination_range.begin || 0,
        ]
        binds << pagination_range.end unless pagination_range.end.nil?

        upper_bound_cond = begin
          if pagination_range.end.nil?
            ''
          elsif pagination_range.exclude_end?
            'AND id < $5'
          else
            'AND id <= $5'
          end
        end

        ActiveRecord::Base.connection.select_all(<<~SQL.squish, 'grouped_notifications', binds).cast_values.to_h { |k, *values| [k, values] }
          SELECT
            groups.group_key,
            (SELECT id FROM notifications WHERE notifications.account_id = $1 AND notifications.group_key = groups.group_key #{upper_bound_cond} ORDER BY id DESC LIMIT 1),
            array(SELECT from_account_id FROM notifications WHERE notifications.account_id = $1 AND notifications.group_key = groups.group_key #{upper_bound_cond} ORDER BY id DESC LIMIT $2),
            (SELECT count(*) FROM notifications WHERE notifications.account_id = $1 AND notifications.group_key = groups.group_key #{upper_bound_cond}) AS notifications_count,
            (SELECT id FROM notifications WHERE notifications.account_id = $1 AND notifications.group_key = groups.group_key AND id >= $4 ORDER BY id ASC LIMIT 1) AS min_id,
            (SELECT created_at FROM notifications WHERE notifications.account_id = $1 AND notifications.group_key = groups.group_key #{upper_bound_cond} ORDER BY id DESC LIMIT 1)
          FROM
            unnest($3::text[]) AS groups(group_key);
        SQL
      else
        binds = [
          account_id,
          SAMPLE_ACCOUNTS_SIZE,
          ActiveRecord::Relation::QueryAttribute.new('group_keys', group_keys, ActiveRecord::ConnectionAdapters::PostgreSQL::OID::Array.new(ActiveModel::Type::String.new)),
        ]

        ActiveRecord::Base.connection.select_all(<<~SQL.squish, 'grouped_notifications', binds).cast_values.to_h { |k, *values| [k, values] }
          SELECT
            groups.group_key,
            (SELECT id FROM notifications WHERE notifications.account_id = $1 AND notifications.group_key = groups.group_key ORDER BY id DESC LIMIT 1),
            array(SELECT from_account_id FROM notifications WHERE notifications.account_id = $1 AND notifications.group_key = groups.group_key ORDER BY id DESC LIMIT $2),
            (SELECT count(*) FROM notifications WHERE notifications.account_id = $1 AND notifications.group_key = groups.group_key) AS notifications_count
          FROM
            unnest($3::text[]) AS groups(group_key);
        SQL
      end
    end
  end
end

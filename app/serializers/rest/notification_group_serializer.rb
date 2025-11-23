# frozen_string_literal: true

class REST::NotificationGroupSerializer < ActiveModel::Serializer
  # Please update app/javascript/api_types/notification.ts when making changes to the attributes
  attributes :group_key, :notifications_count, :most_recent_notification_id

  attribute :type

  def type
    # Convert internal reaction type to emoji_reaction for frontend compatibility
    object.type == :reaction ? :emoji_reaction : object.type
  end

  attribute :page_min_id, if: :paginated?
  attribute :page_max_id, if: :paginated?
  attribute :latest_page_notification_at, if: :paginated?

  attribute :sample_account_ids
  attribute :status_id, if: :status_type?
  attribute :sample_reactions, if: :reaction_type?
  belongs_to :report, if: :report_type?, serializer: REST::ReportSerializer
  belongs_to :account_relationship_severance_event, key: :event, if: :relationship_severance_event?, serializer: REST::AccountRelationshipSeveranceEventSerializer
  belongs_to :account_warning, key: :moderation_warning, if: :moderation_warning_event?, serializer: REST::AccountWarningSerializer

  def sample_account_ids
    object.sample_accounts.pluck(:id).map(&:to_s)
  end

  def status_id
    object.target_status&.id&.to_s
  end

  def status_type?
    [:favourite, :reblog, :status, :mention, :poll, :update, :reaction].include?(object.type)
  end

  def report_type?
    object.type == :'admin.report'
  end

  def relationship_severance_event?
    object.type == :severed_relationships
  end

  def moderation_warning_event?
    object.type == :moderation_warning
  end

  def reaction_type?
    object.type == :reaction
  end

  def sample_reactions
    object.sample_reactions
  end

  def page_min_id
    object.pagination_data[:min_id].to_s
  end

  def page_max_id
    object.most_recent_notification_id.to_s
  end

  def latest_page_notification_at
    object.pagination_data[:latest_notification_at]
  end

  def paginated?
    object.pagination_data.present?
  end
end

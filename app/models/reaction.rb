# frozen_string_literal: true

# == Schema Information
#
# Table name: reactions
#
#  id              :bigint(8)        not null, primary key
#  account_id      :bigint(8)
#  status_id       :bigint(8)
#  name            :string           default(""), not null
#  custom_emoji_id :bigint(8)
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#

class Reaction < ApplicationRecord
  include Paginable

  update_index('statuses', :status)

  belongs_to :account, inverse_of: :reactions
  belongs_to :status, inverse_of: :reactions

  has_one :notification, as: :activity, dependent: :destroy

  validates :status_id, uniqueness: { 
    scope: [:account_id, :name, :custom_emoji_id]
  }

  belongs_to :custom_emoji, optional: true
  validates :name, presence: true
  validates_with StatusReactionValidator

  before_validation :set_custom_emoji, :trim_domain

  before_validation do
    self.status = status.reblog if status&.reblog?
  end

  after_create :increment_cache_counters
  after_destroy :decrement_cache_counters

  def users
    account_ids = Reaction.where(status_id: status_id, name: name, custom_emoji_id: custom_emoji_id).select(:account_id)
    Account.where(id: account_ids).limit(11)
  end

  def self.find_by_name(account, status_id, name)
    shortcode = name unless name.include?('@')
    shortcode = name.split('@')[0] if name.include?('@')
    domain = name.split('@')[1] if name.include?('@')

    customEmoji = CustomEmoji.find_by(shortcode: shortcode, domain: domain) if domain.present?
    customEmoji = CustomEmoji.local.find_by(shortcode: shortcode) unless domain.present?

    reaction = account.reactions.find_by(status_id: status_id, custom_emoji_id: customEmoji.id) if customEmoji.present?
    reaction = account.reactions.find_by(status_id: status_id, name: shortcode) unless customEmoji.present?

    reaction
  end

  private

  def set_custom_emoji
    return if custom_emoji.present?
    self.custom_emoji = if domain_present?
                          CustomEmoji.find_by(disabled: false, shortcode: shortcode, domain: domain)
                        else
                          CustomEmoji.local.find_by(disabled: false, shortcode: name)
                        end
  end

  def increment_cache_counters
    status&.increment_count!(:reactions_count)
  end

  def decrement_cache_counters
    return if association(:status).loaded? && status.marked_for_destruction?
    status&.decrement_count!(:reactions_count)
  end

  def trim_domain
    self.name = shortcode if domain_present?
  end

  def domain_present?
    name.include? '@'
  end

  def shortcode
    name.split('@')[0]
  end

  def domain
    name.split('@')[1]
  end
end

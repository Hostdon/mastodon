# frozen_string_literal: true

class REST::EmojiReactionSerializer < ActiveModel::Serializer
  include RoutingHelper

  attributes :name, :count, :status_id, :account_ids, :me

  attribute :url, if: :custom_emoji?
  attribute :static_url, if: :custom_emoji?
  attribute :domain, if: :custom_emoji?

  def count
    related_reaction.count
  end

  def me
    related_reaction.me
  end

  def account_ids
    [object.account_id.to_s]
  end
  
  def url
    full_asset_url(object.custom_emoji.image.url)
  end
  
  def static_url
    full_asset_url(object.custom_emoji.image.url(:static))
  end
  
  def domain
    return nil unless object.custom_emoji.present?
    object.custom_emoji.domain
  end

  def custom_emoji?
    object.custom_emoji.present?
  end

  private
  def related_reaction
    return @related_reaction_cache if @related_reaction_cache.present?
    @related_reaction_cache = object.status.reactions_hash(current_user&.account).find{|r|
      if r.custom_emoji.present?
        r.custom_emoji.present? && r.custom_emoji.domain == domain && r.name == object.name
      else
        r.name == object.name
      end
    }
  end
end

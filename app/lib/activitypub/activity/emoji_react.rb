# frozen_string_literal: true

class ActivityPub::Activity::EmojiReact < ActivityPub::Activity
  def perform
    return if @json['content'].blank?
    original_status = status_from_uri(object_uri)

    return if original_status.nil? || delete_arrived_first?(@json['id'])
    
    
    process_tags

    reaction = original_status.reactions.create!(account: @account, name: @json['content']) if @json['tag'].nil? && !@account.reacted_with?(original_status, @json['content'])

    reaction = original_status.reactions.create!(account: @account, name: @json['content']&.delete(':'), custom_emoji: @emoji) if @emoji.present? && !@account.custom_emoji_reacted?(original_status, @emoji)

    return if reaction.nil?

    LocalNotificationWorker.perform_async(original_status.account_id, reaction.id, 'Reaction', 'reaction') if original_status.account.local?
    Trends.statuses.register(original_status)
  end

  def process_tags
    return if @json['tag'].nil?
    as_array(@json['tag']).each do |tag|
      if equals_or_includes?(tag['type'], 'Emoji')
        process_emoji tag
      end
    end
  end

  def process_emoji(tag)
    return if skip_download?

    custom_emoji_parser = ActivityPub::Parser::CustomEmojiParser.new(tag)

    return if custom_emoji_parser.shortcode.blank? || custom_emoji_parser.image_remote_url.blank?

    @emoji = CustomEmoji.find_by(shortcode: custom_emoji_parser.shortcode, domain: custom_emoji_parser.domain)

    return unless @emoji.nil? || custom_emoji_parser.image_remote_url != @emoji.image_remote_url || (custom_emoji_parser.updated_at && custom_emoji_parser.updated_at >= @emoji.updated_at)

    begin
      @emoji ||= CustomEmoji.new(domain: custom_emoji_parser.domain, shortcode: custom_emoji_parser.shortcode, uri: custom_emoji_parser.uri)
      @emoji.image_remote_url = custom_emoji_parser.image_remote_url
      @emoji.save
    rescue Seahorse::Client::NetworkingError => e
      Rails.logger.warn "Error storing emoji: #{e}"
    end
  end

  def skip_download?
    @skip_download ||= DomainBlock.reject_media?(@account.domain)
  end
end

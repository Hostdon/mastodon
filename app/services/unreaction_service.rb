# frozen_string_literal: true

class UnreactionService < BaseService
  include Payloadable

  def call(account, status, name)
    reaction = Reaction.find_by_name(account, status.id, name)
    throw ActiveRecord::RecordNotFound unless reaction.present?
    reaction.destroy!
    create_notification(account, reaction)
    reaction
  end

  def call_all(account, status)
    reactions = Reaction.where(account: account, status: status)
    reactions.destroy_all
    reactions.each do |reaction|
      create_notification(account, reaction)
    end
    reactions
  end

  private

  def create_notification(current_account, reaction)
    status = reaction.status
    ActivityPub::ReactionsDistributionWorker.perform_async(build_json(reaction), current_account.id, status.account.shared_inbox_url)
  end

  def build_json(reaction)
    Oj.dump(serialize_payload(reaction, ActivityPub::UndoEmojiReactSerializer))
  end
end

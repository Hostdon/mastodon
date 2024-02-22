# frozen_string_literal: true

class ActivityPub::ReactionsDistributionWorker < ActivityPub::RawDistributionWorker
  # Distribute reactions to servers that might have a copy
  # of the account in question
  def perform(json, source_account_id, target_inbox_url)
    @account        = Account.find(source_account_id)
    @json           = json
    if target_inbox_url.empty? then
      @target_inboxes = []
    else
      @target_inboxes = [target_inbox_url]
    end

    distribute!
  rescue ActiveRecord::RecordNotFound
    true
  end

  protected

  def inboxes
    @inboxes ||= (AccountReachFinder.new(@account).inboxes + @target_inboxes).uniq
  end

  def payload
    @json
  end
end

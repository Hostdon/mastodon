class RemoveUnneededIndexes5 < ActiveRecord::Migration[5.2]
  def change
    remove_index :account_moderation_notes, name: "index_account_moderation_notes_on_account_id"
    remove_index :account_moderation_notes, name: "index_account_moderation_notes_on_target_account_id"
    remove_index :accounts_tags, name: "index_accounts_tags_on_account_id_and_tag_id"
    remove_index :invites, name: "index_invites_on_user_id"
    remove_index :list_accounts, name: "index_list_accounts_on_follow_id"
    remove_index :list_accounts, name: "index_list_accounts_on_list_id_and_account_id"
    remove_index :lists, name: "index_lists_on_account_id"
    remove_index :report_notes, name: "index_report_notes_on_account_id"
    remove_index :report_notes, name: "index_report_notes_on_report_id"
    remove_index :scheduled_statuses, name: "index_scheduled_statuses_on_scheduled_at" 
  end
end

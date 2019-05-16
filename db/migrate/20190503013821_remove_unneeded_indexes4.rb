class RemoveUnneededIndexes4 < ActiveRecord::Migration[5.2]
  def change
  remove_index :account_conversations, name: "index_account_conversations_on_account_id"
  remove_index :account_identity_proofs, name: "index_account_identity_proofs_on_account_id"
  remove_index :account_pins, name: "index_account_pins_on_account_id"
  end
end

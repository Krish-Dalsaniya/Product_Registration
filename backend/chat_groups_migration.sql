CREATE TABLE IF NOT EXISTS chat_groups (
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_group_members (
    group_id UUID REFERENCES chat_groups(group_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES chat_groups(group_id) ON DELETE CASCADE;
ALTER TABLE chat_messages ALTER COLUMN receiver_id DROP NOT NULL;

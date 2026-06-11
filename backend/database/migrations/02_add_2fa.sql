CREATE TABLE IF NOT EXISTS user_two_factor (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    two_factor_secret VARCHAR(255),
    is_two_factor_enabled BOOLEAN DEFAULT false
);

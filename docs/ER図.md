# ER図

```mermaid
erDiagram
    USER {
        string id PK
        string github_username UK
        string display_name
        string bio
        int age "nullable"
        boolean age_verified
        int experience_years
        string hobbies
    }

    USER_STACK_TAG {
        string user_id FK
        string tag
    }

    USER_REACTION {
        string from_user_id FK
        string to_user_id FK
        string reaction_type "LIKE / SUPER_LIKE"
    }

    USER_MATCH {
        string match_key PK
        string user_id FK
        string matched_user_id FK
    }

    MESSAGE {
        string id PK
        string match_key FK
        string sender_id FK
        string receiver_id FK
        string text
        boolean is_read
        number timestamp
        string type
    }

    SESSION {
        string user_id FK
    }

    USER ||--o{ USER_STACK_TAG : has
    USER ||--o{ USER_REACTION : reacts_from
    USER ||--o{ USER_REACTION : reacts_to
    USER ||--o{ USER_MATCH : has_match
    USER ||--o{ USER_MATCH : matched_by
    USER_MATCH ||--o{ MESSAGE : contains
    USER ||--o{ MESSAGE : sends
    USER ||--o{ MESSAGE : receives
    USER ||--o| SESSION : logs_in
```

## 補足
- `match_key` は実装上 `sort(userId, matchId).join('-')` で生成されます。
- 現在のコードでは `likedUserIds` / `superLikedUserIds` / `matches` / `stackTags` は `USER` 内の配列ですが、ER図では関係を明確にするため中間エンティティへ正規化して表現しています。
- `SESSION` は `matchmaking_session` キーで保持している「現在ログイン中ユーザー」を表します。

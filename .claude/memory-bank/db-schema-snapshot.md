# DB Schema Snapshot

> Auto-generated on 2026-03-24 by `npx tsx scripts/generate-db-schema-snapshot.ts`
> Source: `lib/database.types.ts` + `supabase/migrations/*.sql`
> **Do not edit manually** — re-run the script to update.

## Summary

- **58 tables** | **20 enums** | **96 functions** | **6 views**

---

## Tables

### Auth & Teams

<details>
<summary><strong>companies</strong> (16 cols, 4 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| address_id | `string` | YES |
| created_at | `string` | YES |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| email | `string` | YES |
| id | `string` | NO |
| is_active | `boolean` | YES |
| legal_name | `string` | YES |
| logo_url | `string` | YES |
| name | `string` | NO |
| notes | `string` | YES |
| phone | `string` | YES |
| team_id | `string` | NO |
| updated_at | `string` | YES |
| vat_number | `string` | YES |
| website | `string` | YES |

**FK Relationships:**
- `address_id` → `addresses(id)`
- `deleted_by` → `users(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: companies_select
- INSERT [PERMISSIVE]: companies_insert
- UPDATE [PERMISSIVE]: companies_update
- DELETE [PERMISSIVE]: companies_delete

</details>

<details>
<summary><strong>company_members</strong> (9 cols, 4 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| company_id | `string` | NO |
| created_at | `string` | YES |
| id | `string` | NO |
| joined_at | `string` | YES |
| left_at | `string` | YES |
| role | `string` | YES |
| team_id | `string` | NO |
| updated_at | `string` | YES |
| user_id | `string` | NO |

**FK Relationships:**
- `company_id` → `companies(id)`
- `team_id` → `teams(id)`
- `user_id` → `users(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: company_members_select
- INSERT [PERMISSIVE]: company_members_insert
- UPDATE [PERMISSIVE]: company_members_update
- DELETE [PERMISSIVE]: company_members_delete

</details>

<details>
<summary><strong>team_members</strong> (6 cols, 4 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| id | `string` | NO |
| joined_at | `string` | YES |
| left_at | `string` | YES |
| role | `enum:team_member_role` | NO |
| team_id | `string` | NO |
| user_id | `string` | NO |

**FK Relationships:**
- `team_id` → `teams(id)`
- `user_id` → `users(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: team_members_select
- INSERT [PERMISSIVE]: team_members_insert
- UPDATE [PERMISSIVE]: team_members_update
- DELETE [PERMISSIVE]: team_members_delete

</details>

<details>
<summary><strong>teams</strong> (9 cols, 3 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| created_at | `string` | YES |
| created_by | `string` | YES |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| description | `string` | YES |
| id | `string` | NO |
| name | `string` | NO |
| settings | `Json` | YES |
| updated_at | `string` | YES |

**FK Relationships:**
- `created_by` → `users(id)`
- `deleted_by` → `users(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: teams_select_own
- INSERT [PERMISSIVE]: teams_insert_by_gestionnaire
- UPDATE [PERMISSIVE]: teams_update_by_admin

</details>

<details>
<summary><strong>user_invitations</strong> (15 cols, 4 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| accepted_at | `string` | YES |
| created_at | `string` | YES |
| email | `string` | NO |
| expires_at | `string` | NO |
| first_name | `string` | YES |
| id | `string` | NO |
| invitation_token | `string` | YES |
| invited_at | `string` | NO |
| invited_by | `string` | NO |
| last_name | `string` | YES |
| role | `enum:user_role` | NO |
| status | `enum:invitation_status` | NO |
| team_id | `string` | NO |
| updated_at | `string` | YES |
| user_id | `string` | YES |

**FK Relationships:**
- `invited_by` → `users(id)`
- `team_id` → `teams(id)`
- `user_id` → `users(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: user_invitations_select
- INSERT [PERMISSIVE]: user_invitations_insert
- UPDATE [PERMISSIVE]: user_invitations_update
- DELETE [PERMISSIVE]: user_invitations_delete

</details>

<details>
<summary><strong>users</strong> (25 cols, 4 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| address | `string` | YES |
| auth_user_id | `string` | YES |
| avatar_url | `string` | YES |
| company | `string` | YES |
| company_id | `string` | YES |
| created_at | `string` | YES |
| custom_role_description | `string` | YES |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| email | `string` | YES |
| first_name | `string` | YES |
| id | `string` | NO |
| is_active | `boolean` | YES |
| is_company | `boolean` | YES |
| last_name | `string` | YES |
| name | `string` | NO |
| notes | `string` | YES |
| password_set | `boolean` | YES |
| phone | `string` | YES |
| provider_rating | `number` | YES |
| role | `enum:user_role` | NO |
| speciality | `string` | YES |
| team_id | `string` | YES |
| total_interventions | `number` | YES |
| updated_at | `string` | YES |

**FK Relationships:**
- `company_id` → `companies(id)`
- `deleted_by` → `users(id)`
- `team_id` → `teams(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- INSERT [PERMISSIVE]: users_insert_contacts
- DELETE [PERMISSIVE]: users_delete_by_admin
- SELECT [PERMISSIVE]: users_select
- UPDATE [PERMISSIVE]: users_update

</details>

### Properties

<details>
<summary><strong>addresses</strong> (14 cols, 3 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| city | `string` | NO |
| country | `enum:country` | NO |
| created_at | `string` | NO |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| formatted_address | `string` | YES |
| id | `string` | NO |
| latitude | `number` | YES |
| longitude | `number` | YES |
| place_id | `string` | YES |
| postal_code | `string` | NO |
| street | `string` | NO |
| team_id | `string` | NO |
| updated_at | `string` | NO |

**FK Relationships:**
- `deleted_by` → `users(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: Team members can view addresses
- INSERT [PERMISSIVE]: Gestionnaires can insert addresses
- UPDATE [PERMISSIVE]: Gestionnaires can update addresses

</details>

<details>
<summary><strong>building_contacts</strong> (9 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| building_id | `string` | NO |
| created_at | `string` | NO |
| id | `string` | NO |
| is_primary | `boolean` | YES |
| notes | `string` | YES |
| role | `string` | YES |
| team_id | `string` | YES |
| updated_at | `string` | NO |
| user_id | `string` | NO |

**FK Relationships:**
- `building_id` → `buildings(id)`
- `team_id` → `teams(id)`
- `user_id` → `users(id)`

</details>

<details>
<summary><strong>buildings</strong> (15 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| active_interventions | `number` | YES |
| address_id | `string` | YES |
| created_at | `string` | NO |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| description | `string` | YES |
| id | `string` | NO |
| metadata | `Json` | YES |
| name | `string` | NO |
| occupied_lots | `number` | YES |
| team_id | `string` | NO |
| total_interventions | `number` | YES |
| total_lots | `number` | YES |
| updated_at | `string` | NO |
| vacant_lots | `number` | YES |

**FK Relationships:**
- `address_id` → `addresses(id)`
- `deleted_by` → `users(id)`
- `team_id` → `teams(id)`

</details>

<details>
<summary><strong>lot_contacts</strong> (9 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| created_at | `string` | NO |
| id | `string` | NO |
| is_primary | `boolean` | YES |
| lot_id | `string` | NO |
| notes | `string` | YES |
| role | `string` | YES |
| team_id | `string` | YES |
| updated_at | `string` | NO |
| user_id | `string` | NO |

**FK Relationships:**
- `lot_id` → `lots(id)`
- `team_id` → `teams(id)`
- `user_id` → `users(id)`

</details>

<details>
<summary><strong>lots</strong> (16 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| active_interventions | `number` | YES |
| address_id | `string` | YES |
| apartment_number | `string` | YES |
| building_id | `string` | YES |
| category | `enum:lot_category` | NO |
| created_at | `string` | NO |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| description | `string` | YES |
| floor | `number` | YES |
| id | `string` | NO |
| metadata | `Json` | YES |
| reference | `string` | NO |
| team_id | `string` | NO |
| total_interventions | `number` | YES |
| updated_at | `string` | NO |

**FK Relationships:**
- `address_id` → `addresses(id)`
- `building_id` → `buildings(id)`
- `deleted_by` → `users(id)`
- `team_id` → `teams(id)`

</details>

### Interventions

<details>
<summary><strong>activity_logs</strong> (19 cols, 1 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| action_type | `enum:activity_action_type` | NO |
| building_id | `string` | YES |
| created_at | `string` | NO |
| description | `string` | NO |
| display_context | `string` | YES |
| display_title | `string` | YES |
| entity_id | `string` | YES |
| entity_name | `string` | YES |
| entity_type | `enum:activity_entity_type` | NO |
| error_message | `string` | YES |
| id | `string` | NO |
| intervention_id | `string` | YES |
| ip_address | `unknown` | NO |
| lot_id | `string` | YES |
| metadata | `Json` | YES |
| status | `enum:activity_status` | NO |
| team_id | `string` | NO |
| user_agent | `string` | YES |
| user_id | `string` | NO |

**FK Relationships:**
- `building_id` → `buildings(id)`
- `intervention_id` → `interventions(id)`
- `lot_id` → `lots(id)`
- `team_id` → `teams(id)`
- `user_id` → `users(id)`

**RLS Policies:**
- INSERT [PERMISSIVE]: activity_logs_insert

</details>

<details>
<summary><strong>intervention_assignments</strong> (16 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| assigned_at | `string` | NO |
| assigned_by | `string` | YES |
| confirmation_notes | `string` | YES |
| confirmation_status | `string` | YES |
| confirmed_at | `string` | YES |
| created_at | `string` | NO |
| id | `string` | NO |
| intervention_id | `string` | NO |
| is_primary | `boolean` | YES |
| notes | `string` | YES |
| notified | `boolean` | YES |
| provider_instructions | `string` | YES |
| requires_confirmation | `boolean` | NO |
| role | `string` | NO |
| updated_at | `string` | NO |
| user_id | `string` | NO |

**FK Relationships:**
- `assigned_by` → `users(id)`
- `intervention_id` → `interventions(id)`
- `user_id` → `users(id)`

</details>

<details>
<summary><strong>intervention_comments</strong> (8 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| content | `string` | NO |
| created_at | `string` | NO |
| deleted_at | `string` | YES |
| id | `string` | NO |
| intervention_id | `string` | NO |
| is_internal | `boolean` | NO |
| updated_at | `string` | NO |
| user_id | `string` | NO |

**FK Relationships:**
- `intervention_id` → `interventions(id)`
- `user_id` → `users(id)`

</details>

<details>
<summary><strong>intervention_documents</strong> (20 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| description | `string` | YES |
| document_type | `enum:intervention_document_type` | NO |
| file_size | `number` | NO |
| filename | `string` | NO |
| id | `string` | NO |
| intervention_id | `string` | NO |
| is_validated | `boolean` | YES |
| message_id | `string` | YES |
| mime_type | `string` | NO |
| original_filename | `string` | NO |
| storage_bucket | `string` | NO |
| storage_path | `string` | NO |
| team_id | `string` | NO |
| updated_at | `string` | YES |
| uploaded_at | `string` | NO |
| uploaded_by | `string` | NO |
| validated_at | `string` | YES |
| validated_by | `string` | YES |

**FK Relationships:**
- `deleted_by` → `users(id)`
- `intervention_id` → `interventions(id)`
- `message_id` → `conversation_messages(id)`
- `team_id` → `teams(id)`
- `uploaded_by` → `users(id)`
- `validated_by` → `users(id)`

</details>

<details>
<summary><strong>intervention_links</strong> (7 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| child_intervention_id | `string` | NO |
| created_at | `string` | NO |
| created_by | `string` | YES |
| id | `string` | NO |
| link_type | `string` | NO |
| parent_intervention_id | `string` | NO |
| provider_id | `string` | NO |

**FK Relationships:**
- `child_intervention_id` → `interventions(id)`
- `created_by` → `users(id)`
- `parent_intervention_id` → `interventions(id)`
- `provider_id` → `users(id)`

</details>

<details>
<summary><strong>intervention_quotes</strong> (19 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| amount | `number` | NO |
| created_at | `string` | NO |
| created_by | `string` | NO |
| currency | `string` | NO |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| description | `string` | YES |
| id | `string` | NO |
| intervention_id | `string` | NO |
| line_items | `Json` | YES |
| provider_id | `string` | NO |
| quote_type | `string` | NO |
| rejection_reason | `string` | YES |
| status | `string` | NO |
| team_id | `string` | NO |
| updated_at | `string` | NO |
| valid_until | `string` | YES |
| validated_at | `string` | YES |
| validated_by | `string` | YES |

**FK Relationships:**
- `created_by` → `users(id)`
- `deleted_by` → `users(id)`
- `intervention_id` → `interventions(id)`
- `provider_id` → `users(id)`
- `team_id` → `teams(id)`
- `validated_by` → `users(id)`

</details>

<details>
<summary><strong>intervention_reports</strong> (13 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| content | `string` | NO |
| created_at | `string` | NO |
| created_by | `string` | NO |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| id | `string` | NO |
| intervention_id | `string` | NO |
| is_internal | `boolean` | YES |
| metadata | `Json` | YES |
| report_type | `string` | NO |
| team_id | `string` | NO |
| title | `string` | NO |
| updated_at | `string` | NO |

**FK Relationships:**
- `created_by` → `users(id)`
- `deleted_by` → `users(id)`
- `intervention_id` → `interventions(id)`
- `team_id` → `teams(id)`

</details>

<details>
<summary><strong>intervention_time_slots</strong> (20 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| cancelled_at | `string` | YES |
| cancelled_by | `string` | YES |
| created_at | `string` | NO |
| end_time | `string` | NO |
| id | `string` | NO |
| intervention_id | `string` | NO |
| is_selected | `boolean` | YES |
| notes | `string` | YES |
| proposed_by | `string` | YES |
| provider_id | `string` | YES |
| rejected_by_manager | `boolean` | NO |
| rejected_by_provider | `boolean` | NO |
| rejected_by_tenant | `boolean` | NO |
| selected_by_manager | `boolean` | NO |
| selected_by_provider | `boolean` | NO |
| selected_by_tenant | `boolean` | NO |
| slot_date | `string` | NO |
| start_time | `string` | NO |
| status | `enum:time_slot_status` | NO |
| team_id | `string` | YES |

**FK Relationships:**
- `cancelled_by` → `users(id)`
- `intervention_id` → `interventions(id)`
- `proposed_by` → `users(id)`
- `provider_id` → `users(id)`
- `team_id` → `teams(id)`

</details>

<details>
<summary><strong>intervention_type_categories</strong> (19 cols, 4 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| code | `string` | NO |
| created_at | `string` | NO |
| description_fr | `string` | YES |
| id | `string` | NO |
| is_active | `boolean` | YES |
| label_fr | `string` | NO |
| sort_order | `number` | YES |
| new_code | `string` | NO |
| old_code | `string` | NO |
| category_id | `string` | NO |
| code | `string` | NO |
| color_class | `string` | YES |
| created_at | `string` | NO |
| description_fr | `string` | YES |
| icon_name | `string` | YES |
| id | `string` | NO |
| is_active | `boolean` | YES |
| label_fr | `string` | NO |
| sort_order | `number` | YES |

**FK Relationships:**
- `category_id` → `intervention_type_categories(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: intervention_type_categories_select
- INSERT [PERMISSIVE]: intervention_type_categories_admin_insert
- UPDATE [PERMISSIVE]: intervention_type_categories_admin_update
- DELETE [PERMISSIVE]: intervention_type_categories_admin_delete

</details>

<details>
<summary><strong>interventions</strong> (34 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| assignment_mode | `enum:assignment_mode` | NO |
| building_id | `string` | YES |
| completed_date | `string` | YES |
| contract_id | `string` | YES |
| created_at | `string` | NO |
| created_by | `string` | YES |
| creation_source | `string` | YES |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| description | `string` | NO |
| estimated_cost | `number` | YES |
| final_cost | `number` | YES |
| has_attachments | `boolean` | NO |
| id | `string` | NO |
| is_contested | `boolean` | YES |
| lot_id | `string` | YES |
| metadata | `Json` | YES |
| provider_guidelines | `string` | YES |
| reference | `string` | NO |
| requested_date | `string` | YES |
| requires_participant_confirmation | `boolean` | NO |
| requires_quote | `boolean` | NO |
| scheduled_date | `string` | YES |
| scheduling_method | `string` | YES |
| scheduling_type | `enum:intervention_scheduling_type` | NO |
| selected_slot_id | `string` | YES |
| source | `string` | YES |
| specific_location | `string` | YES |
| status | `enum:intervention_status` | NO |
| team_id | `string` | NO |
| title | `string` | NO |
| type | `string` | NO |
| updated_at | `string` | NO |
| urgency | `enum:intervention_urgency` | NO |

**FK Relationships:**
- `building_id` → `buildings(id)`
- `contract_id` → `contracts(id)`
- `created_by` → `users(id)`
- `deleted_by` → `users(id)`
- `lot_id` → `lots(id)`
- `selected_slot_id` → `intervention_time_slots(id)`
- `team_id` → `teams(id)`

</details>

### Conversations

<details>
<summary><strong>conversation_messages</strong> (9 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| content | `string` | NO |
| created_at | `string` | NO |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| id | `string` | NO |
| metadata | `Json` | YES |
| team_id | `string` | YES |
| thread_id | `string` | NO |
| user_id | `string` | NO |

**FK Relationships:**
- `deleted_by` → `users(id)`
- `team_id` → `teams(id)`
- `thread_id` → `conversation_threads(id)`
- `user_id` → `users(id)`

</details>

<details>
<summary><strong>conversation_participants</strong> (6 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| id | `string` | NO |
| joined_at | `string` | NO |
| last_read_at | `string` | YES |
| last_read_message_id | `string` | YES |
| thread_id | `string` | NO |
| user_id | `string` | NO |

**FK Relationships:**
- `last_read_message_id` → `conversation_messages(id)`
- `thread_id` → `conversation_threads(id)`
- `user_id` → `users(id)`

</details>

<details>
<summary><strong>conversation_threads</strong> (13 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| created_at | `string` | NO |
| created_by | `string` | NO |
| email_id | `string` | YES |
| id | `string` | NO |
| intervention_id | `string` | YES |
| last_email_notification_at | `string` | YES |
| last_message_at | `string` | YES |
| message_count | `number` | YES |
| participant_id | `string` | YES |
| team_id | `string` | NO |
| thread_type | `enum:conversation_thread_type` | NO |
| title | `string` | YES |
| updated_at | `string` | NO |

**FK Relationships:**
- `created_by` → `users(id)`
- `email_id` → `emails(id)`
- `intervention_id` → `interventions(id)`
- `participant_id` → `users(id)`
- `team_id` → `teams(id)`

</details>

### Contracts

<details>
<summary><strong>contract_contacts</strong> (8 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| contract_id | `string` | NO |
| created_at | `string` | NO |
| id | `string` | NO |
| is_primary | `boolean` | YES |
| notes | `string` | YES |
| role | `enum:contract_contact_role` | NO |
| updated_at | `string` | NO |
| user_id | `string` | NO |

**FK Relationships:**
- `contract_id` → `contracts(id)`
- `user_id` → `users(id)`

</details>

<details>
<summary><strong>contract_documents</strong> (19 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| contract_id | `string` | NO |
| created_at | `string` | NO |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| description | `string` | YES |
| document_type | `enum:contract_document_type` | NO |
| expiry_date | `string` | YES |
| file_size | `number` | NO |
| filename | `string` | NO |
| id | `string` | NO |
| mime_type | `string` | NO |
| original_filename | `string` | NO |
| storage_bucket | `string` | NO |
| storage_path | `string` | NO |
| team_id | `string` | NO |
| title | `string` | YES |
| updated_at | `string` | NO |
| uploaded_at | `string` | NO |
| uploaded_by | `string` | YES |

**FK Relationships:**
- `contract_id` → `contracts(id)`
- `deleted_by` → `users(id)`
- `team_id` → `teams(id)`
- `uploaded_by` → `users(id)`

</details>

<details>
<summary><strong>contracts</strong> (28 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| auto_rent_calls | `boolean` | NO |
| charges_amount | `number` | YES |
| charges_type | `enum:charges_type` | NO |
| comments | `string` | YES |
| contract_type | `enum:contract_type` | NO |
| created_at | `string` | NO |
| created_by | `string` | NO |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| duration_months | `number` | NO |
| end_date | `string` | YES |
| guarantee_amount | `number` | YES |
| guarantee_notes | `string` | YES |
| guarantee_type | `enum:guarantee_type` | NO |
| id | `string` | NO |
| lot_id | `string` | NO |
| metadata | `Json` | YES |
| payment_frequency | `enum:payment_frequency` | NO |
| payment_frequency_value | `number` | NO |
| renewed_from_id | `string` | YES |
| renewed_to_id | `string` | YES |
| rent_amount | `number` | NO |
| signed_date | `string` | YES |
| start_date | `string` | NO |
| status | `enum:contract_status` | NO |
| team_id | `string` | NO |
| title | `string` | NO |
| updated_at | `string` | NO |

**FK Relationships:**
- `created_by` → `users(id)`
- `deleted_by` → `users(id)`
- `lot_id` → `lots(id)`
- `renewed_from_id` → `contracts(id)`
- `renewed_to_id` → `contracts(id)`
- `team_id` → `teams(id)`

</details>

<details>
<summary><strong>supplier_contract_documents</strong> (12 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| created_at | `string` | NO |
| deleted_at | `string` | YES |
| file_size | `number` | YES |
| filename | `string` | NO |
| id | `string` | NO |
| mime_type | `string` | YES |
| original_filename | `string` | NO |
| storage_bucket | `string` | NO |
| storage_path | `string` | NO |
| supplier_contract_id | `string` | NO |
| team_id | `string` | NO |
| uploaded_by | `string` | YES |

**FK Relationships:**
- `supplier_contract_id` → `supplier_contracts(id)`
- `team_id` → `teams(id)`
- `uploaded_by` → `users(id)`

</details>

<details>
<summary><strong>supplier_contracts</strong> (19 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| building_id | `string` | YES |
| cost | `number` | YES |
| cost_frequency | `string` | YES |
| created_at | `string` | NO |
| created_by | `string` | YES |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| description | `string` | YES |
| end_date | `string` | YES |
| id | `string` | NO |
| lot_id | `string` | YES |
| metadata | `Json` | YES |
| notice_date | `string` | YES |
| notice_period | `string` | YES |
| reference | `string` | NO |
| status | `string` | NO |
| supplier_id | `string` | YES |
| team_id | `string` | NO |
| updated_at | `string` | NO |

**FK Relationships:**
- `building_id` → `buildings(id)`
- `created_by` → `users(id)`
- `deleted_by` → `users(id)`
- `lot_id` → `lots(id)`
- `supplier_id` → `users(id)`
- `team_id` → `teams(id)`

</details>

### Documents & Storage

<details>
<summary><strong>import_jobs</strong> (18 cols, 4 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| completed_at | `string` | YES |
| created_at | `string` | YES |
| created_ids | `Json` | YES |
| entity_type | `enum:import_entity_type` | NO |
| error_count | `number` | NO |
| errors | `Json` | YES |
| filename | `string` | NO |
| id | `string` | NO |
| metadata | `Json` | YES |
| processed_rows | `number` | NO |
| started_at | `string` | YES |
| status | `enum:import_job_status` | NO |
| success_count | `number` | NO |
| team_id | `string` | NO |
| total_rows | `number` | NO |
| updated_at | `string` | YES |
| updated_ids | `Json` | YES |
| user_id | `string` | NO |

**FK Relationships:**
- `team_id` → `teams(id)`
- `user_id` → `users(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: import_jobs_select_team_member
- INSERT [PERMISSIVE]: import_jobs_insert_gestionnaire
- UPDATE [PERMISSIVE]: import_jobs_update_own
- DELETE [PERMISSIVE]: import_jobs_delete_own

</details>

<details>
<summary><strong>property_documents</strong> (24 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| building_id | `string` | YES |
| category | `string` | YES |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| description | `string` | YES |
| document_date | `string` | YES |
| document_type | `enum:property_document_type` | NO |
| expiry_date | `string` | YES |
| file_size | `number` | NO |
| filename | `string` | NO |
| id | `string` | NO |
| is_archived | `boolean` | YES |
| lot_id | `string` | YES |
| mime_type | `string` | NO |
| original_filename | `string` | NO |
| storage_bucket | `string` | NO |
| storage_path | `string` | NO |
| tags | `string[]` | YES |
| team_id | `string` | NO |
| title | `string` | YES |
| updated_at | `string` | YES |
| uploaded_at | `string` | NO |
| uploaded_by | `string` | NO |
| visibility_level | `enum:document_visibility_level` | NO |

**FK Relationships:**
- `building_id` → `buildings(id)`
- `deleted_by` → `users(id)`
- `lot_id` → `lots(id)`
- `team_id` → `teams(id)`
- `uploaded_by` → `users(id)`

</details>

### Billing (Stripe)

<details>
<summary><strong>stripe_customers</strong> (6 cols, 1 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| created_at | `string` | NO |
| email | `string` | YES |
| id | `string` | NO |
| name | `string` | YES |
| stripe_customer_id | `string` | NO |
| team_id | `string` | NO |

**FK Relationships:**
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: Team admins can view stripe customer

</details>

<details>
<summary><strong>stripe_invoices</strong> (15 cols, 1 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| amount_due | `number` | NO |
| amount_paid | `number` | NO |
| amount_remaining | `number` | NO |
| created_at | `string` | NO |
| currency | `string` | NO |
| hosted_invoice_url | `string` | YES |
| id | `string` | NO |
| invoice_pdf | `string` | YES |
| paid_at | `string` | YES |
| period_end | `string` | YES |
| period_start | `string` | YES |
| status | `string` | NO |
| stripe_customer_id | `string` | NO |
| stripe_invoice_id | `string` | NO |
| subscription_id | `string` | YES |

**FK Relationships:**
- `subscription_id` → `subscriptions(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: Team admins can view invoices

</details>

<details>
<summary><strong>stripe_webhook_events</strong> (4 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| event_id | `string` | NO |
| event_type | `string` | NO |
| processed_at | `string` | NO |
| team_id | `string` | YES |

**FK Relationships:**
- `team_id` → `teams(id)`

</details>

<details>
<summary><strong>subscriptions</strong> (24 cols, 1 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| billable_properties | `number` | NO |
| cancel_at | `string` | YES |
| cancel_at_period_end | `boolean` | NO |
| canceled_at | `string` | YES |
| created_at | `string` | NO |
| current_period_end | `string` | YES |
| current_period_start | `string` | YES |
| ended_at | `string` | YES |
| id | `string` | NO |
| last_behavioral_email_at | `string` | YES |
| notification_j1_sent | `boolean` | NO |
| notification_j3_sent | `boolean` | NO |
| notification_j7_sent | `boolean` | NO |
| payment_method_added | `boolean` | NO |
| price_id | `string` | YES |
| status | `enum:subscription_status` | NO |
| stripe_customer_id | `string` | YES |
| stripe_subscription_id | `string` | YES |
| subscribed_lots | `number` | NO |
| team_id | `string` | NO |
| trial_end | `string` | YES |
| trial_expired_email_sent | `boolean` | NO |
| trial_start | `string` | YES |
| updated_at | `string` | NO |

**FK Relationships:**
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: Team admins can view subscription

</details>

### Notifications

<details>
<summary><strong>email_links</strong> (8 cols, 3 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| email_id | `string` | NO |
| entity_id | `string` | NO |
| entity_type | `enum:email_link_entity_type` | NO |
| id | `string` | NO |
| linked_at | `string` | NO |
| linked_by | `string` | YES |
| notes | `string` | YES |
| team_id | `string` | NO |

**FK Relationships:**
- `email_id` → `emails(id)`
- `linked_by` → `users(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: Team managers can view email links
- INSERT [PERMISSIVE]: Team managers can create email links
- DELETE [PERMISSIVE]: Team managers can delete email links

</details>

<details>
<summary><strong>notifications</strong> (15 cols, 1 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| archived | `boolean` | YES |
| created_at | `string` | NO |
| created_by | `string` | YES |
| id | `string` | NO |
| is_personal | `boolean` | NO |
| message | `string` | NO |
| metadata | `Json` | YES |
| read | `boolean` | YES |
| read_at | `string` | YES |
| related_entity_id | `string` | YES |
| related_entity_type | `string` | YES |
| team_id | `string` | YES |
| title | `string` | NO |
| type | `enum:notification_type` | NO |
| user_id | `string` | NO |

**FK Relationships:**
- `created_by` → `users(id)`
- `team_id` → `teams(id)`
- `user_id` → `users(id)`

**RLS Policies:**
- INSERT [PERMISSIVE]: notifications_insert_authenticated

</details>

<details>
<summary><strong>push_subscriptions</strong> (7 cols, 4 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| created_at | `string` | YES |
| endpoint | `string` | NO |
| id | `string` | NO |
| keys | `Json` | NO |
| updated_at | `string` | YES |
| user_agent | `string` | YES |
| user_id | `string` | NO |

**FK Relationships:**
- `user_id` → `users(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: Users can view own push subscriptions
- INSERT [PERMISSIVE]: Users can create own push subscriptions
- UPDATE [PERMISSIVE]: Users can update own push subscriptions
- DELETE [PERMISSIVE]: Users can delete own push subscriptions

</details>

### AI & Phone

<details>
<summary><strong>ai_phone_calls</strong> (16 cols, 1 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| call_status | `string` | NO |
| caller_phone | `string` | YES |
| channel | `string` | NO |
| created_at | `string` | NO |
| duration_seconds | `number` | YES |
| elevenlabs_conversation_id | `string` | NO |
| id | `string` | NO |
| identified_user_id | `string` | YES |
| intervention_id | `string` | YES |
| language | `string` | NO |
| media_urls | `Json` | NO |
| pdf_document_id | `string` | YES |
| phone_number_id | `string` | YES |
| structured_summary | `Json` | YES |
| team_id | `string` | NO |
| transcript | `string` | YES |

**FK Relationships:**
- `identified_user_id` → `users(id)`
- `intervention_id` → `interventions(id)`
- `pdf_document_id` → `intervention_documents(id)`
- `phone_number_id` → `ai_phone_numbers(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: Team managers can view AI call logs

</details>

<details>
<summary><strong>ai_phone_numbers</strong> (16 cols, 1 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| ai_tier | `string` | NO |
| auto_topup | `boolean` | NO |
| created_at | `string` | NO |
| custom_instructions | `string` | YES |
| elevenlabs_agent_id | `string` | YES |
| elevenlabs_phone_number_id | `string` | YES |
| id | `string` | NO |
| is_active | `boolean` | NO |
| phone_number | `string` | NO |
| stripe_ai_price_id | `string` | YES |
| stripe_ai_subscription_id | `string` | YES |
| stripe_subscription_id | `string` | YES |
| team_id | `string` | NO |
| telnyx_connection_id | `string` | YES |
| telnyx_phone_number_id | `string` | YES |
| updated_at | `string` | NO |

**FK Relationships:**
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: Team admins can view AI phone config

</details>

<details>
<summary><strong>ai_phone_usage</strong> (8 cols, 1 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| calls_count | `number` | NO |
| created_at | `string` | NO |
| id | `string` | NO |
| minutes_used | `number` | NO |
| month | `string` | NO |
| overage_minutes | `number` | NO |
| team_id | `string` | NO |
| updated_at | `string` | NO |

**FK Relationships:**
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: Team admins can view AI usage

</details>

### Operations

<details>
<summary><strong>recurrence_occurrences</strong> (11 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| confirmed_at | `string` | YES |
| confirmed_by | `string` | YES |
| created_at | `string` | NO |
| generated_entity_id | `string` | YES |
| generated_entity_type | `string` | YES |
| id | `string` | NO |
| occurrence_date | `string` | NO |
| rule_id | `string` | NO |
| skipped_reason | `string` | YES |
| status | `string` | NO |
| team_id | `string` | NO |

**FK Relationships:**
- `confirmed_by` → `users(id)`
- `rule_id` → `recurrence_rules(id)`
- `team_id` → `teams(id)`

</details>

<details>
<summary><strong>recurrence_rules</strong> (12 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| auto_create | `boolean` | NO |
| created_at | `string` | NO |
| created_by | `string` | NO |
| dtstart | `string` | NO |
| id | `string` | NO |
| is_active | `boolean` | NO |
| notify_days_before | `number` | NO |
| rrule | `string` | NO |
| source_template | `Json` | NO |
| source_type | `string` | NO |
| team_id | `string` | NO |
| updated_at | `string` | NO |

**FK Relationships:**
- `created_by` → `users(id)`
- `team_id` → `teams(id)`

</details>

<details>
<summary><strong>reminders</strong> (19 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| assigned_to | `string` | YES |
| building_id | `string` | YES |
| completed_at | `string` | YES |
| contact_id | `string` | YES |
| contract_id | `string` | YES |
| created_at | `string` | NO |
| created_by | `string` | NO |
| deleted_at | `string` | YES |
| description | `string` | YES |
| due_date | `string` | YES |
| id | `string` | NO |
| lot_id | `string` | YES |
| parent_occurrence_id | `string` | YES |
| priority | `string` | NO |
| recurrence_rule_id | `string` | YES |
| status | `string` | NO |
| team_id | `string` | NO |
| title | `string` | NO |
| updated_at | `string` | NO |

**FK Relationships:**
- `assigned_to` → `users(id)`
- `building_id` → `buildings(id)`
- `contact_id` → `users(id)`
- `contract_id` → `supplier_contracts(id)`
- `created_by` → `users(id)`
- `lot_id` → `lots(id)`
- `parent_occurrence_id` → `recurrence_occurrences(id)`
- `recurrence_rule_id` → `recurrence_rules(id)`
- `team_id` → `teams(id)`

</details>

### Bank

<details>
<summary><strong>auto_linking_rules</strong> (16 cols, 3 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| conditions | `Json` | NO |
| created_at | `string` | NO |
| created_by | `string` | NO |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| id | `string` | NO |
| is_active | `boolean` | NO |
| last_applied_at | `string` | YES |
| name | `string` | NO |
| target_contract_id | `string` | YES |
| target_intervention_id | `string` | YES |
| target_supplier_contract_id | `string` | YES |
| target_type | `string` | NO |
| team_id | `string` | NO |
| times_applied | `number` | NO |
| updated_at | `string` | NO |

**FK Relationships:**
- `created_by` → `users(id)`
- `deleted_by` → `users(id)`
- `target_contract_id` → `contracts(id)`
- `target_intervention_id` → `interventions(id)`
- `target_supplier_contract_id` → `supplier_contracts(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: auto_linking_rules_select
- INSERT [PERMISSIVE]: auto_linking_rules_insert
- UPDATE [PERMISSIVE]: auto_linking_rules_update

</details>

<details>
<summary><strong>bank_connections</strong> (29 cols, 4 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| account_name | `string` | YES |
| account_purpose | `string` | NO |
| account_type | `string` | YES |
| balance | `number` | YES |
| bank_logo_url | `string` | YES |
| bank_name | `string` | NO |
| blacklisted_at | `string` | YES |
| blacklisted_by | `string` | YES |
| consent_expires_at | `string` | YES |
| created_at | `string` | NO |
| created_by | `string` | NO |
| currency | `string` | NO |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| iban_encrypted | `string` | YES |
| iban_last4 | `string` | YES |
| id | `string` | NO |
| is_blacklisted | `boolean` | NO |
| last_sync_at | `string` | YES |
| sync_error_message | `string` | YES |
| sync_status | `string` | NO |
| team_id | `string` | NO |
| tink_access_token_encrypted | `string` | YES |
| tink_account_id | `string` | NO |
| tink_credentials_id | `string` | YES |
| tink_refresh_token_encrypted | `string` | YES |
| tink_user_id | `string` | NO |
| token_expires_at | `string` | YES |
| updated_at | `string` | NO |

**FK Relationships:**
- `blacklisted_by` → `users(id)`
- `created_by` → `users(id)`
- `deleted_by` → `users(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: bank_connections_select
- INSERT [PERMISSIVE]: bank_connections_insert
- UPDATE [PERMISSIVE]: bank_connections_update
- DELETE [PERMISSIVE]: bank_connections_delete

</details>

<details>
<summary><strong>bank_transactions</strong> (27 cols, 3 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| amount | `number` | NO |
| bank_connection_id | `string` | NO |
| created_at | `string` | NO |
| currency | `string` | NO |
| description_detailed | `string` | YES |
| description_display | `string` | YES |
| description_original | `string` | NO |
| id | `string` | NO |
| ignored_at | `string` | YES |
| ignored_by | `string` | YES |
| merchant_category_code | `string` | YES |
| merchant_name | `string` | YES |
| payee_account_number | `string` | YES |
| payee_name | `string` | YES |
| payer_account_number | `string` | YES |
| payer_name | `string` | YES |
| provider_transaction_id | `string` | YES |
| reconciled_at | `string` | YES |
| reconciled_by | `string` | YES |
| reference | `string` | YES |
| status | `string` | NO |
| team_id | `string` | NO |
| tink_status | `string` | YES |
| tink_transaction_id | `string` | NO |
| transaction_date | `string` | NO |
| updated_at | `string` | NO |
| value_date | `string` | YES |

**FK Relationships:**
- `bank_connection_id` → `bank_connections(id)`
- `ignored_by` → `users(id)`
- `reconciled_by` → `users(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: bank_transactions_select
- INSERT [PERMISSIVE]: bank_transactions_insert
- UPDATE [PERMISSIVE]: bank_transactions_update

</details>

<details>
<summary><strong>property_expenses</strong> (18 cols, 3 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| amount | `number` | NO |
| building_id | `string` | YES |
| category | `string` | NO |
| created_at | `string` | NO |
| created_by | `string` | NO |
| deleted_at | `string` | YES |
| deleted_by | `string` | YES |
| due_date | `string` | NO |
| id | `string` | NO |
| is_recurring | `boolean` | NO |
| label | `string` | NO |
| lot_id | `string` | YES |
| period_end | `string` | YES |
| period_start | `string` | YES |
| recurrence_frequency | `string` | YES |
| status | `string` | NO |
| team_id | `string` | NO |
| updated_at | `string` | NO |

**FK Relationships:**
- `building_id` → `buildings(id)`
- `created_by` → `users(id)`
- `deleted_by` → `users(id)`
- `lot_id` → `lots(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: property_expenses_select
- INSERT [PERMISSIVE]: property_expenses_insert
- UPDATE [PERMISSIVE]: property_expenses_update

</details>

<details>
<summary><strong>rent_calls</strong> (18 cols, 3 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| building_id | `string` | YES |
| charges_amount | `number` | NO |
| contract_id | `string` | NO |
| created_at | `string` | NO |
| due_date | `string` | NO |
| id | `string` | NO |
| is_auto_generated | `boolean` | NO |
| last_reminder_sent_at | `string` | YES |
| lot_id | `string` | NO |
| period_end | `string` | NO |
| period_start | `string` | NO |
| reminder_count | `number` | NO |
| rent_amount | `number` | NO |
| status | `string` | NO |
| team_id | `string` | NO |
| total_expected | `number` | YES |
| total_received | `number` | NO |
| updated_at | `string` | NO |

**FK Relationships:**
- `building_id` → `buildings(id)`
- `contract_id` → `contracts(id)`
- `lot_id` → `lots(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: rent_calls_select
- INSERT [PERMISSIVE]: rent_calls_insert
- UPDATE [PERMISSIVE]: rent_calls_update

</details>

<details>
<summary><strong>security_deposits</strong> (18 cols, 3 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| account_reference | `string` | YES |
| amount | `number` | NO |
| bank_name | `string` | YES |
| contract_id | `string` | NO |
| created_at | `string` | NO |
| created_by | `string` | NO |
| currency | `string` | NO |
| deductions | `Json` | YES |
| deposit_type | `string` | NO |
| id | `string` | NO |
| lot_id | `string` | NO |
| received_at | `string` | YES |
| return_due_date | `string` | YES |
| returned_amount | `number` | YES |
| returned_at | `string` | YES |
| status | `string` | NO |
| team_id | `string` | NO |
| updated_at | `string` | NO |

**FK Relationships:**
- `contract_id` → `contracts(id)`
- `created_by` → `users(id)`
- `lot_id` → `lots(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: security_deposits_select
- INSERT [PERMISSIVE]: security_deposits_insert
- UPDATE [PERMISSIVE]: security_deposits_update

</details>

<details>
<summary><strong>transaction_links</strong> (16 cols, 3 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| auto_rule_id | `string` | YES |
| bank_transaction_id | `string` | NO |
| entity_type | `string` | NO |
| id | `string` | NO |
| intervention_id | `string` | YES |
| linked_at | `string` | NO |
| linked_by | `string` | NO |
| match_confidence | `number` | YES |
| match_method | `string` | NO |
| property_expense_id | `string` | YES |
| rent_call_id | `string` | YES |
| security_deposit_id | `string` | YES |
| supplier_contract_id | `string` | YES |
| team_id | `string` | NO |
| unlinked_at | `string` | YES |
| unlinked_by | `string` | YES |

**FK Relationships:**
- `auto_rule_id` → `auto_linking_rules(id)`
- `bank_transaction_id` → `bank_transactions(id)`
- `intervention_id` → `interventions(id)`
- `linked_by` → `users(id)`
- `property_expense_id` → `property_expenses(id)`
- `rent_call_id` → `rent_calls(id)`
- `security_deposit_id` → `security_deposits(id)`
- `supplier_contract_id` → `supplier_contracts(id)`
- `team_id` → `teams(id)`
- `unlinked_by` → `users(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: transaction_links_select
- INSERT [PERMISSIVE]: transaction_links_insert
- UPDATE [PERMISSIVE]: transaction_links_update

</details>

### Other

<details>
<summary><strong>email_attachments</strong> (7 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| content_type | `string` | YES |
| created_at | `string` | YES |
| email_id | `string` | NO |
| filename | `string` | NO |
| id | `string` | NO |
| size_bytes | `number` | NO |
| storage_path | `string` | NO |

**FK Relationships:**
- `email_id` → `emails(id)`

</details>

<details>
<summary><strong>email_blacklist</strong> (7 cols, 3 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| blocked_by_user_id | `string` | YES |
| created_at | `string` | YES |
| id | `string` | NO |
| reason | `string` | YES |
| sender_domain | `string` | YES |
| sender_email | `string` | NO |
| team_id | `string` | NO |

**FK Relationships:**
- `blocked_by_user_id` → `users(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: Team members can view their blacklist
- INSERT [PERMISSIVE]: Team managers can insert blacklist entries
- DELETE [PERMISSIVE]: Team managers can delete blacklist entries

</details>

<details>
<summary><strong>email_shares</strong> (7 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| created_at | `string` | YES |
| email_id | `string` | NO |
| id | `string` | NO |
| shared_by_user_id | `string` | NO |
| shared_with_user_id | `string` | NO |
| team_id | `string` | NO |
| thread_id | `string` | NO |

**FK Relationships:**
- `email_id` → `emails(id)`
- `shared_by_user_id` → `users(id)`
- `shared_with_user_id` → `users(id)`
- `team_id` → `teams(id)`
- `thread_id` → `conversation_threads(id)`

</details>

<details>
<summary><strong>email_webhook_logs</strong> (12 cols, 2 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| created_at | `string` | YES |
| error_message | `string` | YES |
| event_type | `string` | NO |
| id | `string` | NO |
| intervention_id | `string` | YES |
| processing_time_ms | `number` | YES |
| recipient_address | `string` | NO |
| resend_email_id | `string` | NO |
| sender_address | `string` | NO |
| status | `string` | NO |
| subject | `string` | YES |
| user_id | `string` | YES |

**FK Relationships:**
- `intervention_id` → `interventions(id)`
- `user_id` → `users(id)`

**RLS Policies:**
- SELECT [PERMISSIVE]: Admins can view webhook logs
- INSERT [PERMISSIVE]: Service role can insert webhook logs

</details>

<details>
<summary><strong>emails</strong> (24 cols, 3 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| bcc_addresses | `string[]` | YES |
| body_html | `string` | YES |
| body_text | `string` | YES |
| building_id | `string` | YES |
| cc_addresses | `string[]` | YES |
| created_at | `string` | YES |
| deleted_at | `string` | YES |
| direction | `enum:email_direction` | NO |
| email_connection_id | `string` | YES |
| from_address | `string` | NO |
| id | `string` | NO |
| in_reply_to | `string` | YES |
| in_reply_to_header | `string` | YES |
| intervention_id | `string` | YES |
| lot_id | `string` | YES |
| message_id | `string` | YES |
| received_at | `string` | YES |
| references | `string` | YES |
| search_vector | `unknown` | NO |
| sent_at | `string` | YES |
| status | `enum:email_status` | YES |
| subject | `string` | NO |
| team_id | `string` | NO |
| to_addresses | `string[]` | NO |

**FK Relationships:**
- `building_id` → `buildings(id)`
- `email_connection_id` → `team_email_connections(id)`
- `in_reply_to` → `emails(id)`
- `intervention_id` → `interventions(id)`
- `lot_id` → `lots(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- INSERT [PERMISSIVE]: Team managers can insert emails
- UPDATE [PERMISSIVE]: Team managers can update their emails
- DELETE [PERMISSIVE]: Team managers can delete their emails

</details>

<details>
<summary><strong>team_email_connections</strong> (28 cols, 4 RLS)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| added_by_user_id | `string` | NO |
| auth_method | `string` | YES |
| created_at | `string` | YES |
| email_address | `string` | NO |
| id | `string` | NO |
| imap_host | `string` | YES |
| imap_password_encrypted | `string` | YES |
| imap_port | `number` | NO |
| imap_use_ssl | `boolean` | YES |
| imap_username | `string` | YES |
| is_active | `boolean` | YES |
| last_error | `string` | YES |
| last_sync_at | `string` | YES |
| last_uid | `number` | YES |
| oauth_access_token | `string` | YES |
| oauth_refresh_token | `string` | YES |
| oauth_scope | `string` | YES |
| oauth_token_expires_at | `string` | YES |
| provider | `string` | NO |
| smtp_host | `string` | YES |
| smtp_password_encrypted | `string` | YES |
| smtp_port | `number` | NO |
| smtp_use_tls | `boolean` | YES |
| smtp_username | `string` | YES |
| sync_from_date | `string` | YES |
| team_id | `string` | NO |
| updated_at | `string` | YES |
| visibility | `string` | YES |

**FK Relationships:**
- `added_by_user_id` → `users(id)`
- `team_id` → `teams(id)`

**RLS Policies:**
- INSERT [PERMISSIVE]: Team managers can insert email connections
- UPDATE [PERMISSIVE]: Team managers can update their email connections
- DELETE [PERMISSIVE]: Team managers can delete their email connections
- SELECT [PERMISSIVE]: Team members can view accessible email connections

</details>

<details>
<summary><strong>time_slot_responses</strong> (8 cols)</summary>

| Column | Type | Nullable |
|--------|------|----------|
| created_at | `string` | NO |
| id | `string` | NO |
| notes | `string` | YES |
| response | `enum:response_type` | NO |
| time_slot_id | `string` | NO |
| updated_at | `string` | NO |
| user_id | `string` | NO |
| user_role | `enum:user_role` | NO |

**FK Relationships:**
- `time_slot_id` → `intervention_time_slots(id)`
- `user_id` → `users(id)`

</details>

---

## Enums (20)

- **activity_action_type**: `create` | `update` | `delete` | `view` | `assign` | `unassign` | `approve` | `reject` | `upload` | `download` | `share` | `comment` | `status_change` | `send_notification` | `login` | `logout` | `import`
- **activity_entity_type**: `user` | `team` | `building` | `lot` | `intervention` | `document` | `contact` | `notification` | `message` | `quote` | `report` | `import` | `contract` | `failure` | `group` | `provision`
- **contract_contact_role**: `locataire` | `colocataire` | `garant` | `representant_legal` | `autre`
- **contract_document_type**: `bail` | `avenant` | `etat_des_lieux_entree` | `etat_des_lieux_sortie` | `attestation_assurance` | `justificatif_identite` | `justificatif_revenus` | `caution_bancaire` | `quittance` | `reglement_copropriete` | `diagnostic` | `autre` | `actif` | `bail_meuble`
- **conversation_thread_type**: `group` | `tenant_to_managers` | `provider_to_managers` | `email_internal` | `tenants_group` | `providers_group`
- **country**: `belgique` | `france` | `allemagne` | `pays-bas` | `suisse` | `luxembourg` | `autre` | `locataire` | `sent`
- **email_link_entity_type**: `building` | `lot` | `contract` | `contact` | `company` | `intervention` | `read`
- **guarantee_type**: `pas_de_garantie` | `compte_proprietaire` | `compte_bloque` | `e_depot` | `autre` | `lot`
- **import_job_status**: `pending` | `validating` | `importing` | `completed` | `failed` | `cancelled`
- **intervention_document_type**: `rapport` | `photo_avant` | `photo_apres` | `facture` | `devis` | `plan` | `certificat` | `garantie` | `bon_de_commande` | `autre` | `email` | `note_vocale` | `rapport_appel_ia` | `fixed`
- **intervention_status**: `demande` | `rejetee` | `approuvee` | `planification` | `planifiee` | `cloturee_par_prestataire` | `cloturee_par_locataire` | `cloturee_par_gestionnaire` | `annulee`
- **intervention_type**: `plomberie` | `electricite` | `chauffage` | `serrurerie` | `peinture` | `menage` | `jardinage` | `autre` | `normale` | `accepted`
- **lot_category**: `appartement` | `maison` | `garage` | `local_commercial` | `autre`
- **notification_type**: `intervention` | `chat` | `document` | `system` | `team_invite` | `assignment` | `status_change` | `reminder` | `deadline` | `email_reply_received` | `trimestriel`
- **property_document_type**: `bail` | `garantie` | `facture` | `diagnostic` | `photo_compteur` | `plan` | `reglement_copropriete` | `etat_des_lieux` | `certificat` | `manuel_utilisation` | `photo_generale` | `autre` | `certificat_peb` | `conformite_electrique` | `conformite_gaz` | `detecteurs_fumee` | `entretien_chaudiere` | `controle_ascenseur` | `citerne_mazout` | `inventaire_amiante` | `audit_energetique`
- **provider_category**: `prestataire` | `autre` | `artisan` | `services` | `energie` | `administration` | `juridique` | `rejected`
- **subscription_status**: `trialing` | `active` | `past_due` | `canceled` | `incomplete` | `incomplete_expired` | `unpaid` | `paused` | `free_tier` | `read_only`
- **team_member_role**: `admin` | `gestionnaire` | `locataire` | `prestataire` | `proprietaire` | `garant`
- **time_slot_status**: `requested` | `pending` | `selected` | `rejected` | `cancelled`
- **user_role**: `admin` | `gestionnaire` | `locataire` | `prestataire` | `proprietaire` | `garant`

---

## Functions (96)

### RLS Helper Functions (55)

| Function | Args | Returns | Security |
|----------|------|---------|----------|
| can_create_email_conversation | p_email_id UUID, p_team_id UUID | BOOLEAN | DEFINER |
| can_manage_contract | contract_uuid UUID | BOOLEAN | DEFINER |
| can_manage_intervention | p_intervention_id UUID | BOOLEAN | DEFINER |
| can_manage_quote | p_quote_id UUID | BOOLEAN | DEFINER |
| can_manage_time_slot | p_intervention_id UUID | BOOLEAN | DEFINER |
| can_manager_update_user | target_user_id UUID | BOOLEAN | DEFINER |
| can_send_message_in_thread | p_thread_id UUID | BOOLEAN | DEFINER |
| can_team_add_property | p_team_id UUID | BOOLEAN | DEFINER |
| can_validate_document | p_document_id UUID | BOOLEAN | DEFINER |
| can_view_building | building_uuid UUID | BOOLEAN | DEFINER |
| can_view_contract | contract_uuid UUID | BOOLEAN | DEFINER |
| can_view_conversation | p_thread_id UUID | BOOLEAN | DEFINER |
| can_view_intervention | p_intervention_id UUID | BOOLEAN | DEFINER |
| can_view_lot | lot_uuid UUID | BOOLEAN | DEFINER |
| can_view_quote | p_quote_id UUID | BOOLEAN | DEFINER |
| can_view_report | p_report_id UUID | BOOLEAN | DEFINER |
| can_view_time_slot_for_provider | p_slot_id UUID | BOOLEAN | DEFINER |
| get_accessible_building_ids | — | TABLE(building_id UUID) | DEFINER |
| get_accessible_intervention_ids | — | TABLE(intervention_id UUID) | DEFINER |
| get_accessible_lot_ids | — | TABLE(lot_id UUID) | DEFINER |
| get_building_team_id | building_uuid UUID | UUID | DEFINER |
| get_contract_team_id | contract_uuid UUID | UUID | DEFINER |
| get_current_user_id | — | UUID | DEFINER |
| get_current_user_role | — | user_role | DEFINER |
| get_distinct_linked_entities | p_team_id UUID | TABLE ( | DEFINER |
| get_intervention_team_id | p_intervention_id UUID | UUID | DEFINER |
| get_linked_interventions | p_intervention_id UUID | TABLE ( | DEFINER |
| get_lot_team_id | lot_uuid UUID | UUID | DEFINER |
| get_my_profile_ids | — | TABLE(profile_id UUID) | DEFINER |
| get_notification_reply_groups | p_team_id UUID | TABLE( intervention_id | DEFINER |
| get_supplier_contract_team_id | sc_id UUID | UUID | DEFINER |
| get_team_id_from_document_path | storage_path TEXT | UUID | DEFINER |
| get_team_id_from_storage_path | storage_path TEXT | UUID | DEFINER |
| get_thread_unread_counts | p_thread_ids uuid[], p_user_id uuid | TABLE(thread_id uuid, | DEFINER |
| get_user_id_from_auth | — | UUID | DEFINER |
| get_user_teams_v2 | — | TABLE(team_id UUID) | DEFINER |
| is_admin | — | BOOLEAN | DEFINER |
| is_assigned_to_intervention | p_intervention_id UUID | BOOLEAN | DEFINER |
| is_document_owner | p_document_id UUID | BOOLEAN | DEFINER |
| is_gestionnaire | — | BOOLEAN | DEFINER |
| is_gestionnaire_of_building_team | building_uuid UUID | BOOLEAN | DEFINER |
| is_gestionnaire_of_lot_team | lot_uuid UUID | BOOLEAN | DEFINER |
| is_manager_of_intervention_team | p_intervention_id UUID | BOOLEAN | DEFINER |
| is_notification_recipient | p_notification_id UUID | BOOLEAN | DEFINER |
| is_prestataire_of_intervention | intervention_id_param UUID | BOOLEAN | DEFINER |
| is_provider_assigned_to_building | building_id UUID | BOOLEAN | DEFINER |
| is_provider_assigned_to_lot | lot_id UUID | BOOLEAN | DEFINER |
| is_provider_of_intervention | p_intervention_id UUID | BOOLEAN | DEFINER |
| is_sender_blacklisted | p_team_id UUID, p_sender_email VARCHAR | BOOLEAN | INVOKER |
| is_team_manager | check_team_id UUID | BOOLEAN | DEFINER |
| is_team_member | check_team_id UUID, allowed_roles TEXT[] | BOOLEAN | DEFINER |
| is_team_read_only | p_team_id UUID | BOOLEAN | DEFINER |
| is_tenant_of_intervention | p_intervention_id UUID | BOOLEAN | DEFINER |
| is_tenant_of_lot | lot_uuid UUID | BOOLEAN | DEFINER |
| is_time_slot_fully_validated | slot_id UUID | BOOLEAN | INVOKER |

### Trigger Functions (23)

| Function | Returns | Security |
|----------|---------|----------|
| add_assignment_to_conversation_participants | TRIGGER | DEFINER |
| add_user_to_team | UUID | DEFINER |
| handle_internal_time_slot_rejection | TRIGGER | INVOKER |
| handle_new_user_confirmed | TRIGGER | DEFINER |
| log_intervention_status_change | TRIGGER | INVOKER |
| sync_building_contact_team_id | TRIGGER | DEFINER |
| sync_email_link_team_id | TRIGGER | DEFINER |
| sync_lot_contact_team_id | TRIGGER | DEFINER |
| sync_message_team_id | TRIGGER | DEFINER |
| sync_time_slot_team_id | TRIGGER | DEFINER |
| update_ai_phone_updated_at | TRIGGER | INVOKER |
| update_building_lots_count_from_lot_contacts | TRIGGER | INVOKER |
| update_building_total_lots | TRIGGER | INVOKER |
| update_company_members_updated_at | TRIGGER | INVOKER |
| update_import_jobs_updated_at | TRIGGER | INVOKER |
| update_intervention_comments_updated_at | TRIGGER | INVOKER |
| update_intervention_has_attachments | TRIGGER | INVOKER |
| update_subscription_lot_count | TRIGGER | DEFINER |
| update_thread_message_count | TRIGGER | INVOKER |
| update_time_slot_response_updated_at | TRIGGER | INVOKER |
| update_time_slot_validation_summary | TRIGGER | INVOKER |
| update_updated_at_column | TRIGGER | INVOKER |
| validate_intervention_status_transition | TRIGGER | INVOKER |

### Other Functions (18)

| Function | Args | Returns | Security |
|----------|------|---------|----------|
| auto_set_time_slot_validation | — | TRIGGER | INVOKER |
| auto_share_thread_emails | — | TRIGGER | INVOKER |
| check_single_selected_slot | — | TRIGGER | INVOKER |
| cleanup_old_webhook_events | — | INTEGER | DEFINER |
| cleanup_old_webhook_logs | — | INTEGER | DEFINER |
| create_responses_for_new_timeslot | — | TRIGGER | INVOKER |
| delete_auth_user_on_user_delete | — | TRIGGER | DEFINER |
| delete_team_cascade | p_team_id UUID | JSONB | DEFINER |
| expire_old_invitations | — | INTEGER | DEFINER |
| generate_intervention_reference | — | TRIGGER | INVOKER |
| increment_rent_call_received | p_rent_call_id UUID, p_delta NUMERIC | VOID | DEFINER |
| revoke_contact_access | p_contact_id UUID, p_team_id UUID, p_invitation_id UUID | JSONB | INVOKER |
| scan_pending_recurrences | look_ahead_days INTEGER | TABLE ( | DEFINER |
| search_global | p_query TEXT, p_team_id UUID | TABLE( entity_type | DEFINER |
| set_intervention_team_id | — | TRIGGER | INVOKER |
| soft_delete_intervention_cascade | — | TRIGGER | INVOKER |
| upsert_ai_phone_usage | p_team_id UUID, p_month DATE, p_minutes INTEGER | VOID | DEFINER |
| user_belongs_to_team_v2 | check_team_id UUID | BOOLEAN | DEFINER |

---

## Views (6)

- `activity_logs_with_user`
- `buildings_active`
- `contracts_active`
- `interventions_active`
- `lots_active`
- `lots_with_contacts`

---
*Regenerate: `npx tsx scripts/generate-db-schema-snapshot.ts`*

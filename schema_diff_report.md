# Schema Diff Report: Migration vs Live Database

This report compares the expected schema defined in `migration_refactored.sql` against the live database at `165.232.191.122`.

### ⚠️ Table: `audit_logs`
- **Extra Columns (in DB, not in script):** description

### ⚠️ Table: `hr_designations`
- **Extra Columns (in DB, not in script):** parent_id, job_description, perks, rcd_document_url, pre_requisites, training_requirements, eligibility_criteria, kpi, kra

### ⚠️ Table: `hr_employees`
- **Extra Columns (in DB, not in script):** personal_info, address_info, education_info, emergency_contacts, job_info, pay_info, statutory_info, identities_info, face_descriptor, face_embedding, org_chart_parent_id, emergency_info, family_info

### ⚠️ Table: `hr_attendance`
- **Extra Columns (in DB, not in script):** punch_in_selfie_url, punch_in_latitude, punch_in_longitude, punch_in_device_info, punch_in_ip, punch_in_liveness_challenge, punch_in_liveness_status, punch_in_face_match_score, punch_out_selfie_url, punch_out_latitude, punch_out_longitude, punch_out_device_info, punch_out_ip, punch_out_liveness_challenge, punch_out_liveness_status, punch_out_face_match_score, punch_in_face_status, punch_out_face_status, late_coming, early_going, break_hours, extra_hours

### ⚠️ Table: `leave_requests`
- **Extra Columns (in DB, not in script):** is_half_day, half_day_type, attachment_url

### ⚠️ Table: `hr_holidays`
- **Extra Columns (in DB, not in script):** type

### ⚠️ Table: `hr_salary_structures`
- **Extra Columns (in DB, not in script):** dearness_allowance, performance_incentive, non_compete_incentive, on_project_incentive, recreational_incentive, claims_amount, esi_deduction, internal_emi, personal_advance_deduction, official_advance_deduction, performance_incentive_deduction, on_project_incentive_deduction

### ⚠️ Table: `hr_payrolls`
- **Extra Columns (in DB, not in script):** dearness_allowance, performance_incentive, non_compete_incentive, on_project_incentive, recreational_incentive, claims_amount, esi_deduction, internal_emi, personal_advance_deduction, official_advance_deduction, performance_incentive_deduction, on_project_incentive_deduction, op_pl, utilized_pl, leave_of_current_month, late_comings, deductable_leave, available_pl, total_working_days, total_days_month

### ⚠️ Table: `hr_onboarding`
- **Extra Columns (in DB, not in script):** trainee_id, policy_checklist

### ⚠️ Table: `hr_offboarding`
- **Extra Columns (in DB, not in script):** offboarding_method

### ⚠️ Table: `pms_closure_items`
- **Extra Columns (in DB, not in script):** task_id

### ⚠️ Table: `pms_projects`
- **Extra Columns (in DB, not in script):** repository_owner, repository_name

### ⚠️ Table: `hr_lms_assignments`
- **Extra Columns (in DB, not in script):** trainee_id, intern_id, extension_reason

### ⚠️ Table: `hr_conversion_requests`
- **Missing Columns (in DB):** emp_code, designation_id, etc., 'approved', 'rejected'
- **Extra Columns (in DB, not in script):** status, certificate_url

### ⚠️ Table: `hr_trainees`
- **Extra Columns (in DB, not in script):** image_url, user_id, designation_id

### ⚠️ Table: `hr_candidates`
- **Extra Columns (in DB, not in script):** technical_details, extracted_info, education_details, trello_metadata, kanban_order, date_of_birth, applied_at, shortlisted_for

### ⚠️ Table: `pms_tasks`
- **Extra Columns (in DB, not in script):** sprint_id, story_points, epic_id

### ⚠️ Table: `pms_sprints`
- **Missing Columns (in DB):** active, completed
- **Extra Columns (in DB, not in script):** created_at

### ⚠️ Table: `pms_epics`
- **Missing Columns (in DB):** in, completed
- **Extra Columns (in DB, not in script):** start_date

### ⚠️ Table: `candidate_evaluation_forms`
- **Extra Columns (in DB, not in script):** type, form_schema, form_mode

### ⚠️ Table: `open_positions`
- **Missing Columns (in DB):** skills_form_id, knowledge_form_id, traits_form_id, self_image_form_id, motive_form_id
- **Extra Columns (in DB, not in script):** rcd_doc, prerequisite_doc, training_doc, eligibility_doc, kpi_doc, kra_doc, lms_training_ids, skills, knowledge, traits, self_image, motive

### ⚠️ Table: `hr_interns`
- **Extra Columns (in DB, not in script):** user_id

### ⚠️ Table: `forms`
- **Missing Columns (in DB):** published, archived, closed
- **Extra Columns (in DB, not in script):** is_public, form_mode

### ⚠️ Table: `question_logic`
- **Missing Columns (in DB):** and, or, greater_than, etc., hide, skip
- **Extra Columns (in DB, not in script):** target_question_id, value, action_target_id

### ⚠️ Table: `question_media`
- **Missing Columns (in DB):** video, pdf
- **Extra Columns (in DB, not in script):** url

### ⚠️ Table: `form_responses`
- **Missing Columns (in DB):** submitted
- **Extra Columns (in DB, not in script):** started_at


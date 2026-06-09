-- Altering specialized tables to add file and gallery fields

DO $$ 
DECLARE 
    tbl_name TEXT;
    tables TEXT[] := ARRAY[
        'battery_specs', 
        'flow_meter_specs', 
        'smps_specs', 
        'printer_specs', 
        'speaker_specs', 
        'amplifier_specs', 
        'temperature_sensor_specs', 
        'quality_sensor_specs', 
        'pressure_sensor_specs', 
        'emi_emc_filter_specs', 
        'dc_meter_specs'
    ];
BEGIN 
    FOREACH tbl_name IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS datasheet_file VARCHAR(500)', tbl_name);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS warranty_document VARCHAR(500)', tbl_name);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS part_images_gallery JSONB', tbl_name);
    END LOOP;
END $$;

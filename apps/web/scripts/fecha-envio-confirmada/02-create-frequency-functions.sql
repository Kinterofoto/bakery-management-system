-- Functions to calculate delivery dates based on client frequencies

-- Helper function to calculate the next valid delivery date based on frequency days
CREATE OR REPLACE FUNCTION calculate_next_frequency_date(
    base_date DATE,
    frequency_days INTEGER[]
) RETURNS DATE AS $$
DECLARE
    current_day INTEGER;
    days_to_add INTEGER;
    target_day INTEGER;
    min_days INTEGER := 999;
    result_date DATE;
BEGIN
    -- Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    current_day := EXTRACT(DOW FROM base_date)::INTEGER;

    -- If no frequency days provided, return original date
    IF frequency_days IS NULL OR array_length(frequency_days, 1) = 0 THEN
        RETURN base_date;
    END IF;

    -- Find the next valid frequency day
    FOREACH target_day IN ARRAY frequency_days LOOP
        -- Calculate days to add to reach the target day
        IF target_day >= current_day THEN
            days_to_add := target_day - current_day;
        ELSE
            -- Next week
            days_to_add := 7 - current_day + target_day;
        END IF;

        -- Keep the minimum days to add (closest frequency day)
        IF days_to_add < min_days THEN
            min_days := days_to_add;
        END IF;
    END LOOP;

    -- If same day and it's a frequency day, keep the same date
    IF min_days = 0 THEN
        RETURN base_date;
    END IF;

    result_date := base_date + min_days;

    -- Log the adjustment for debugging
    RAISE NOTICE 'Date adjusted from % to % based on frequency days %', base_date, result_date, frequency_days;

    RETURN result_date;
END;
$$ LANGUAGE plpgsql;

-- Main function to adjust delivery date based on branch frequencies
CREATE OR REPLACE FUNCTION adjust_delivery_date_by_frequency()
RETURNS TRIGGER AS $$
DECLARE
    branch_frequencies INTEGER[];
    adjusted_date DATE;
    requested_date DATE;
BEGIN
    -- Store the original requested date
    requested_date := NEW.expected_delivery_date;
    NEW.requested_delivery_date := requested_date;

    -- Skip adjustment if no branch_id
    IF NEW.branch_id IS NULL THEN
        RAISE NOTICE 'No branch_id provided, keeping original date: %', requested_date;
        RETURN NEW;
    END IF;

    -- Get active frequency days for the branch
    SELECT ARRAY_AGG(day_of_week ORDER BY day_of_week) INTO branch_frequencies
    FROM client_frequencies cf
    WHERE cf.branch_id = NEW.branch_id
    AND cf.is_active = true;

    -- If branch has active frequencies, adjust the delivery date
    IF branch_frequencies IS NOT NULL AND array_length(branch_frequencies, 1) > 0 THEN
        adjusted_date := calculate_next_frequency_date(requested_date, branch_frequencies);
        NEW.expected_delivery_date := adjusted_date;

        RAISE NOTICE 'Order % adjusted delivery date from % to % based on branch % frequencies %',
                    NEW.order_number, requested_date, adjusted_date, NEW.branch_id, branch_frequencies;
    ELSE
        -- No frequencies configured, keep original date
        NEW.expected_delivery_date := requested_date;

        RAISE NOTICE 'No active frequencies for branch %, keeping original date: %', NEW.branch_id, requested_date;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
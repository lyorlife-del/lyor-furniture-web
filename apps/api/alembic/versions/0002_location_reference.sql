CREATE TABLE delivery_cities (
	id TEXT NOT NULL,
	company_id TEXT NOT NULL,
	slug TEXT NOT NULL,
	name TEXT NOT NULL,
	coverage_scope TEXT NOT NULL,
	active BOOLEAN NOT NULL,
	CONSTRAINT delivery_cities_pkey PRIMARY KEY (id),
	CONSTRAINT delivery_city_company_key UNIQUE (id, company_id),
	CONSTRAINT delivery_city_slug_key UNIQUE (company_id, slug)
);

CREATE TABLE postal_reference_versions (
	id TEXT NOT NULL,
	source TEXT NOT NULL,
	license TEXT NOT NULL,
	checksum TEXT NOT NULL,
	verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
	valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
	complete BOOLEAN NOT NULL,
	synthetic BOOLEAN NOT NULL,
	imported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT postal_reference_versions_pkey PRIMARY KEY (id),
	CONSTRAINT postal_reference_dates CHECK (valid_until > verified_at)
);

CREATE TABLE serviceability_audit (
	id TEXT NOT NULL,
	company_id TEXT NOT NULL,
	pincode TEXT NOT NULL,
	reason_code TEXT NOT NULL,
	configuration_revision INTEGER,
	source TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT serviceability_audit_pkey PRIMARY KEY (id)
);

CREATE TABLE delivery_zones (
	id TEXT NOT NULL,
	company_id TEXT NOT NULL,
	city_id TEXT NOT NULL,
	name TEXT NOT NULL,
	active BOOLEAN NOT NULL,
	operational_status TEXT NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT delivery_zones_pkey PRIMARY KEY (id),
	CONSTRAINT delivery_zone_company_key UNIQUE (id, company_id),
	FOREIGN KEY(city_id, company_id) REFERENCES delivery_cities (id, company_id) ON DELETE RESTRICT,
	CONSTRAINT delivery_zone_status CHECK (operational_status IN ('open', 'paused', 'closed'))
);

CREATE TABLE postal_codes (
	reference_id TEXT NOT NULL,
	pincode TEXT NOT NULL,
	country TEXT NOT NULL,
	city TEXT,
	district TEXT,
	state TEXT NOT NULL,
	active BOOLEAN NOT NULL,
	CONSTRAINT postal_codes_pkey PRIMARY KEY (reference_id, pincode),
	CONSTRAINT postal_code_format CHECK (pincode ~ '^[1-9][0-9]{5}$'),
	CONSTRAINT postal_code_country CHECK (country = 'IN'),
	FOREIGN KEY(reference_id) REFERENCES postal_reference_versions (id) ON DELETE RESTRICT
);

CREATE TABLE serviceability_configuration (
	company_id TEXT NOT NULL,
	reference_id TEXT,
	revision INTEGER DEFAULT 0 NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_by TEXT NOT NULL,
	CONSTRAINT serviceability_configuration_pkey PRIMARY KEY (company_id),
	CONSTRAINT serviceability_revision_positive CHECK (revision >= 0),
	FOREIGN KEY(reference_id) REFERENCES postal_reference_versions (id) ON DELETE RESTRICT
);

CREATE TABLE delivery_zone_pincodes (
	id TEXT NOT NULL,
	company_id TEXT NOT NULL,
	zone_id TEXT NOT NULL,
	reference_id TEXT NOT NULL,
	pincode TEXT NOT NULL,
	active BOOLEAN NOT NULL,
	effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
	effective_until TIMESTAMP WITH TIME ZONE,
	CONSTRAINT delivery_zone_pincodes_pkey PRIMARY KEY (id),
	FOREIGN KEY(zone_id, company_id) REFERENCES delivery_zones (id, company_id) ON DELETE RESTRICT,
	FOREIGN KEY(reference_id, pincode) REFERENCES postal_codes (reference_id, pincode) ON DELETE RESTRICT,
	CONSTRAINT delivery_membership_dates CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE TABLE postal_code_areas (
	reference_id TEXT NOT NULL,
	pincode TEXT NOT NULL,
	area_id TEXT NOT NULL,
	coverage_scope TEXT NOT NULL,
	evidence TEXT NOT NULL,
	CONSTRAINT postal_code_areas_pkey PRIMARY KEY (reference_id, pincode, area_id),
	FOREIGN KEY(reference_id, pincode) REFERENCES postal_codes (reference_id, pincode) ON DELETE RESTRICT,
	CONSTRAINT postal_area_scope CHECK (coverage_scope IN ('delhi-nct', 'gurugram-city', 'outside', 'unverified', 'demo-noida'))
);

CREATE INDEX serviceability_audit_time ON serviceability_audit (created_at);

CREATE INDEX delivery_pin_lookup ON delivery_zone_pincodes (company_id, reference_id, pincode, active);

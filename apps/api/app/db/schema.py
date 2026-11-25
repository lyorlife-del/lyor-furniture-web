from sqlalchemy import Connection, text


def schema_snapshot(connection: Connection) -> dict:
    connection.execute(text("SET LOCAL search_path TO public"))
    relations = """
        FROM pg_class AS t
        JOIN pg_namespace AS n ON n.oid = t.relnamespace
    """
    public_domain = """
        WHERE n.nspname = 'public' AND t.relkind IN ('r', 'p')
          AND t.relname NOT IN ('_prisma_migrations', 'alembic_version')
    """
    queries = {
        "tables": f"""
            SELECT t.relname AS name, t.relkind AS kind
            {relations} {public_domain} ORDER BY t.relname
        """,
        "columns": f"""
            SELECT t.relname AS table_name, a.attname AS name,
                   format_type(a.atttypid, a.atttypmod) AS type,
                   a.attnotnull AS not_null, pg_get_expr(d.adbin, d.adrelid) AS default,
                   a.attidentity AS identity, a.attgenerated AS generated
            {relations}
            JOIN pg_attribute AS a ON a.attrelid = t.oid
            LEFT JOIN pg_attrdef AS d ON d.adrelid = t.oid AND d.adnum = a.attnum
            {public_domain} AND a.attnum > 0 AND NOT a.attisdropped
            ORDER BY t.relname, a.attnum
        """,
        "constraints": f"""
            SELECT t.relname AS table_name, c.conname AS name,
                   pg_get_constraintdef(c.oid) AS definition, c.convalidated AS validated
            {relations}
            JOIN pg_constraint AS c ON c.conrelid = t.oid
            {public_domain} AND c.contype <> 'n'
            ORDER BY t.relname, c.conname
        """,
        "indexes": f"""
            SELECT t.relname AS table_name, idx.relname AS name,
                   pg_get_indexdef(i.indexrelid) AS definition, i.indisvalid AS valid
            {relations}
            JOIN pg_index AS i ON i.indrelid = t.oid
            JOIN pg_class AS idx ON idx.oid = i.indexrelid
            {public_domain} ORDER BY t.relname, idx.relname
        """,
    }
    return {
        name: [dict(row) for row in connection.execute(text(query)).mappings()]
        for name, query in queries.items()
    }

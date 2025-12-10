"""
Schema Inspector

Connects to Supabase via REST API and introspects schema.
Uses service role key authentication (same as Lambda functions).
Provides cached schema information for validation.
"""

import os
import logging
import requests
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class ColumnInfo:
    """Information about a database column."""
    name: str
    data_type: str
    is_nullable: bool
    column_default: Optional[str]


@dataclass
class TableInfo:
    """Information about a database table."""
    name: str
    columns: Dict[str, ColumnInfo]


class SchemaInspector:
    """Inspects Supabase database schema via REST API."""
    
    def __init__(self):
        """Initialize schema inspector with Supabase client."""
        self.supabase: Optional[Client] = None
        self._schema_cache: Optional[Dict[str, TableInfo]] = None
        self._init_supabase_client()
    
    def _init_supabase_client(self):
        """Initialize Supabase client with service role key."""
        try:
            url = os.getenv('SUPABASE_URL')
            key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            
            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
            
            self.supabase = create_client(url, key)
            logger.info("Supabase client initialized (REST API)")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise
    
    def introspect_schema(self) -> Dict[str, TableInfo]:
        """
        Introspect database schema via Supabase REST API.
        
        Queries information_schema.columns table to get schema information.
        
        Returns:
            Dictionary mapping table names to TableInfo objects
        """
        if self._schema_cache is not None:
            logger.debug("Returning cached schema")
            return self._schema_cache
        
        logger.info("Introspecting database schema via REST API...")
        
        try:
            # Query information_schema.columns table
            # Note: information_schema is exposed via PostgREST if properly configured
            response = self.supabase.table('information_schema.columns').select(
                'table_name, column_name, data_type, is_nullable, column_default'
            ).eq('table_schema', 'public').order('table_name').execute()
            
            # Check if we got an error (information_schema might not be exposed)
            if hasattr(response, 'error') and response.error:
                logger.warning("information_schema not accessible via REST API, trying alternative method")
                return self._introspect_via_table_sampling()
            
            # Build schema structure from response
            schema: Dict[str, TableInfo] = {}
            
            for row in response.data:
                table_name = row['table_name']
                column_name = row['column_name']
                data_type = row['data_type']
                is_nullable = row['is_nullable']
                column_default = row.get('column_default')
                
                # Create table if not exists
                if table_name not in schema:
                    schema[table_name] = TableInfo(
                        name=table_name,
                        columns={}
                    )
                
                # Add column info
                schema[table_name].columns[column_name] = ColumnInfo(
                    name=column_name,
                    data_type=data_type,
                    is_nullable=(is_nullable == 'YES'),
                    column_default=column_default
                )
            
            # Cache the schema
            self._schema_cache = schema
            
            logger.info(f"Schema introspected: {len(schema)} tables found")
            return schema
            
        except Exception as e:
            logger.warning(f"Primary schema introspection method failed: {e}")
            logger.info("Attempting alternative schema introspection via RPC...")
            return self._introspect_via_rpc()
    
    def _introspect_via_rpc(self) -> Dict[str, TableInfo]:
        """
        Alternative: Use RPC to query information_schema.
        
        This requires a database function to be created first.
        If the function doesn't exist, we'll fall back to table sampling.
        """
        try:
            # Try to call a custom RPC function that returns schema info
            # This function would need to be created in the database:
            # CREATE OR REPLACE FUNCTION get_schema_info()
            # RETURNS TABLE(...) AS $$
            #   SELECT table_name, column_name, data_type, is_nullable, column_default
            #   FROM information_schema.columns
            #   WHERE table_schema = 'public';
            # $$ LANGUAGE sql SECURITY DEFINER;
            
            response = self.supabase.rpc('get_schema_info', {}).execute()
            
            # Build schema from RPC response
            schema: Dict[str, TableInfo] = {}
            
            for row in response.data:
                table_name = row['table_name']
                column_name = row['column_name']
                
                if table_name not in schema:
                    schema[table_name] = TableInfo(name=table_name, columns={})
                
                schema[table_name].columns[column_name] = ColumnInfo(
                    name=column_name,
                    data_type=row['data_type'],
                    is_nullable=(row['is_nullable'] == 'YES'),
                    column_default=row.get('column_default')
                )
            
            self._schema_cache = schema
            logger.info(f"Schema introspected via RPC: {len(schema)} tables found")
            return schema
            
        except Exception as e:
            logger.warning(f"RPC schema introspection failed: {e}")
            logger.info("Falling back to table sampling method...")
            return self._introspect_via_table_sampling()
    
    def _get_all_table_names(self) -> List[str]:
        """
        Dynamically discover all table names from Supabase.
        
        Uses PostgREST's OpenAPI schema endpoint which lists all available tables.
        This works even for empty tables and doesn't require RPC functions.
        """
        try:
            # Query PostgREST's root endpoint which returns OpenAPI schema
            url = os.getenv('SUPABASE_URL')
            key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            
            if not url or not key:
                raise ValueError("Missing Supabase credentials")
            
            # PostgREST exposes schema at the root endpoint
            schema_url = f"{url}/rest/v1/"
            headers = {
                'apikey': key,
                'Authorization': f'Bearer {key}'
            }
            
            response = requests.get(schema_url, headers=headers)
            
            if response.status_code == 200:
                # PostgREST root returns OpenAPI schema with table definitions
                schema_data = response.json()
                
                # Extract table names from OpenAPI definitions
                table_names = []
                
                # Check different possible OpenAPI schema structures
                if 'definitions' in schema_data:
                    table_names = list(schema_data['definitions'].keys())
                elif 'paths' in schema_data:
                    # Extract table names from path definitions
                    for path in schema_data['paths'].keys():
                        # Paths are like "/{table_name}"
                        if path.startswith('/') and len(path) > 1:
                            table_name = path[1:].split('?')[0]
                            if table_name and table_name not in table_names:
                                table_names.append(table_name)
                
                if table_names:
                    logger.info(f"✅ Dynamically discovered {len(table_names)} tables from PostgREST: {sorted(table_names)}")
                    return table_names
                    
        except Exception as e:
            logger.warning(f"PostgREST schema discovery failed: {e}")
        
        # If PostgREST schema fails, try RPC function
        try:
            response = self.supabase.rpc('get_all_tables', {}).execute()
            
            if response.data:
                table_names = [row['table_name'] for row in response.data]
                logger.info(f"✅ Discovered {len(table_names)} tables via RPC: {table_names}")
                return table_names
                
        except Exception as e:
            logger.debug(f"RPC table discovery failed: {e}")
        
        # Final fallback: Query pg_catalog directly via raw SQL if possible
        logger.error("❌ All dynamic table discovery methods failed!")
        logger.error("Please create this database function for full schema introspection:")
        logger.error("""
        CREATE OR REPLACE FUNCTION get_all_tables()
        RETURNS TABLE(table_name text) AS $$
          SELECT tablename::text FROM pg_tables WHERE schemaname = 'public';
        $$ LANGUAGE sql SECURITY DEFINER;
        """)
        
        return []
    
    def _introspect_via_table_sampling(self) -> Dict[str, TableInfo]:
        """
        Fallback: Introspect schema by sampling actual tables.
        
        Dynamically discovers all tables from Supabase, then queries each
        to get column information.
        """
        # Dynamically get all table names
        table_names = self._get_all_table_names()
        
        schema: Dict[str, TableInfo] = {}
        
        for table_name in table_names:
            try:
                # Query table with limit 0 to get column structure without data
                response = self.supabase.table(table_name).select('*').limit(0).execute()
                
                if response.data is not None or hasattr(response, 'columns'):
                    # Table exists - extract column info from response metadata
                    # Note: Supabase client may not expose column metadata directly
                    # We can infer columns from a sample row
                    sample_response = self.supabase.table(table_name).select('*').limit(1).execute()
                    
                    if sample_response.data and len(sample_response.data) > 0:
                        sample_row = sample_response.data[0]
                        columns = {}
                        
                        for col_name in sample_row.keys():
                            # Infer type from value (not perfect but works)
                            value = sample_row[col_name]
                            data_type = type(value).__name__ if value is not None else 'unknown'
                            
                            columns[col_name] = ColumnInfo(
                                name=col_name,
                                data_type=data_type,
                                is_nullable=True,  # Assume nullable
                                column_default=None
                            )
                        
                        schema[table_name] = TableInfo(
                            name=table_name,
                            columns=columns
                        )
                        logger.debug(f"Discovered table '{table_name}' with {len(columns)} columns")
                    else:
                        # Table exists but is empty - we can't infer columns
                        logger.debug(f"Table '{table_name}' exists but is empty")
                        schema[table_name] = TableInfo(name=table_name, columns={})
                        
            except Exception as e:
                logger.debug(f"Table '{table_name}' not accessible: {e}")
                continue
        
        self._schema_cache = schema
        logger.info(f"Schema introspected via sampling: {len(schema)} tables found")
        logger.warning("Schema introspection via sampling has limitations - column types may be approximate")
        
        return schema
    
    def get_table(self, table_name: str) -> Optional[TableInfo]:
        """
        Get information about a specific table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            TableInfo if table exists, None otherwise
        """
        schema = self.introspect_schema()
        return schema.get(table_name)
    
    def table_exists(self, table_name: str) -> bool:
        """Check if a table exists in the schema."""
        return table_name in self.introspect_schema()
    
    def column_exists(self, table_name: str, column_name: str) -> bool:
        """Check if a column exists in a table."""
        table = self.get_table(table_name)
        if not table:
            return False
        return column_name in table.columns
    
    def get_all_tables(self) -> List[str]:
        """Get list of all table names."""
        return list(self.introspect_schema().keys())
    
    def clear_cache(self):
        """Clear the schema cache (force re-introspection on next call)."""
        self._schema_cache = None
        logger.debug("Schema cache cleared")
    
    def close(self):
        """Close Supabase client connections."""
        # Supabase client doesn't require explicit closing
        logger.info("Supabase client closed")
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Export schema as dictionary (for JSON serialization).
        AI-friendly format for programmatic access.
        """
        schema = self.introspect_schema()
        return {
            table_name: {
                'name': table.name,
                'columns': {
                    col_name: {
                        'name': col.name,
                        'data_type': col.data_type,
                        'is_nullable': col.is_nullable,
                        'column_default': col.column_default
                    }
                    for col_name, col in table.columns.items()
                }
            }
            for table_name, table in schema.items()
        }

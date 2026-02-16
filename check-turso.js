const { createClient } = require('@libsql/client');

const client = createClient({
  url: 'libsql://fideliqr-carnicero52.aws-us-east-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE3NzE3OTQ0NjQsImlhdCI6MTc3MTE4OTY2NCwiaWQiOiIxZDRlYTY3Yi05NzYzLTQxOTQtOGM2My1lYjdhYTU0YzY2ZTciLCJyaWQiOiI0YmM2OTU4Zi04NDMyLTRlNWItOTYwMi1jYmQxMjk4YmVhOTgifQ.ttA9GRH7Re1tMA8AWvlIlZ3YW7UjOWLphbSQNyzH0YXJf0vB-xbim3CFO9UbtuZGu9jWZlBgGmy-6qokqwQpBQ'
});

async function checkTables() {
  try {
    const result = await client.execute('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('📊 Tablas en Turso:');
    result.rows.forEach(row => console.log('  -', row.name));
    
    // Verificar estructura de la tabla Negocio
    const negocioSchema = await client.execute('PRAGMA table_info(Negocio)');
    console.log('\n📋 Columnas en Negocio:');
    negocioSchema.rows.forEach(row => console.log('  -', row.name, ':', row.type));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTables();

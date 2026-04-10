// Load environment variables for tests
require('dotenv').config()

// Set test encryption key if not already set
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = 'b79bd720207bd21af0dfe229d7d185fc235d8308ff7d0614fa923e1926a6dfce'
}

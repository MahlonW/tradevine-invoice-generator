import { createConnection } from 'mysql2/promise';
import { env } from '$env/dynamic/private';

let connection: any = null;

export async function getConnection(): Promise<any> {
	// Check if connection exists and is still alive
	if (connection) {
		try {
			// Test the connection with a simple query
			await connection.execute('SELECT 1');
			return connection;
		} catch (error) {
			console.warn('Database connection is closed, creating new connection:', error);
			connection = null; // Reset the connection
		}
	}

	// Create new connection if none exists or if previous one failed
	try {
		connection = await createConnection({
			host: env.DB_HOST || 'your-database-host',
			user: env.DB_USER || 'your-database-username',
			password: env.DB_PASSWORD || 'your-database-password',
			database: env.DB_NAME || 'your-database-name',
			// Keep connection alive to prevent timeouts
			keepAliveInitialDelay: 0,
			enableKeepAlive: true
		});

		// Set up connection event handlers
		connection.on('error', (err: any) => {
			console.error('Database connection error:', err);
			if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
				console.log('Database connection lost, will reconnect on next request');
				connection = null;
			}
		});

		console.log('Database connection established successfully');
		return connection;
	} catch (error) {
		console.error('Failed to create database connection:', error);
		throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

export async function createDatabase(): Promise<void> {
	try {
		const conn = await getConnection();
		
		// Check if the 'orders' table exists
		const [tables] = await conn.execute("SHOW TABLES LIKE 'orders'");
		
		if (!Array.isArray(tables) || tables.length === 0) {
			// Create the 'orders' table if it doesn't exist
			await conn.execute(`
				CREATE TABLE orders (
					order_number VARCHAR(255) PRIMARY KEY,
					invoice_number INT
				)
			`);
			console.log('Orders table created successfully');
		} else {
			console.log('Orders table already exists');
		}
	} catch (error) {
		console.error('Error in createDatabase:', error);
		
		// Create detailed error information
		let errorDetails: {
			message: string;
			type: string;
			timestamp: string;
			details: {
				error?: string;
				code?: string;
				errno?: number;
				sqlState?: string;
				sqlMessage?: string;
				sql?: string;
				operation?: string;
			};
		} = {
			message: 'Database operation failed',
			type: 'DATABASE_ERROR',
			timestamp: new Date().toISOString(),
			details: {
				operation: 'createDatabase'
			}
		};

		if (error instanceof Error) {
			errorDetails.message = error.message;
			errorDetails.details.error = error.message;
		}

		// Check if it's a MySQL error
		if (error && typeof error === 'object' && 'code' in error) {
			const mysqlError = error as any;
			errorDetails.details.code = mysqlError.code;
			errorDetails.details.errno = mysqlError.errno;
			errorDetails.details.sqlState = mysqlError.sqlState;
			errorDetails.details.sqlMessage = mysqlError.sqlMessage;
			errorDetails.details.sql = mysqlError.sql;
			
			// Provide user-friendly messages based on MySQL error codes
			if (mysqlError.code === 'ECONNREFUSED') {
				errorDetails.message = 'Database connection refused - check if database server is running';
			} else if (mysqlError.code === 'ER_ACCESS_DENIED_ERROR') {
				errorDetails.message = 'Database access denied - check username and password';
			} else if (mysqlError.code === 'ER_BAD_DB_ERROR') {
				errorDetails.message = 'Database does not exist - check database name';
			} else if (mysqlError.code === 'PROTOCOL_CONNECTION_LOST') {
				errorDetails.message = 'Database connection lost - connection will be recreated';
			} else if (mysqlError.code === 'ECONNRESET') {
				errorDetails.message = 'Database connection reset - connection will be recreated';
			}
		}

		// Throw the detailed error
		throw new Error(JSON.stringify(errorDetails));
	}
}

export async function getInvoiceNumber(orderNumber: string): Promise<number> {
	try {
		const conn = await getConnection();
		
		// Check if the order exists
		const [rows] = await conn.execute(
			"SELECT invoice_number FROM orders WHERE order_number = ?",
			[orderNumber]
		);
		
		const result = rows as any[];
		
		if (result.length > 0) {
			return result[0].invoice_number;
		} else {
			// Get the highest invoice number
			const [maxRows] = await conn.execute("SELECT MAX(invoice_number) FROM orders");
			const maxResult = maxRows as any[];
			const highestInvoiceNumber = maxResult[0]['MAX(invoice_number)'];
			
			const invoiceNumber = highestInvoiceNumber ? highestInvoiceNumber + 1 : 1;
			
			// Insert the new order with the calculated invoice number
			await conn.execute(
				"INSERT INTO orders (order_number, invoice_number) VALUES (?, ?)",
				[orderNumber, invoiceNumber]
			);
			
			return invoiceNumber;
		}
	} catch (error) {
		console.error('Error in getInvoiceNumber:', error);
		
		// Create detailed error information
		let errorDetails: {
			message: string;
			type: string;
			timestamp: string;
			details: {
				error?: string;
				code?: string;
				errno?: number;
				sqlState?: string;
				sqlMessage?: string;
				sql?: string;
				operation?: string;
				orderNumber?: string;
			};
		} = {
			message: 'Database operation failed',
			type: 'DATABASE_ERROR',
			timestamp: new Date().toISOString(),
			details: {
				operation: 'getInvoiceNumber',
				orderNumber: orderNumber
			}
		};

		if (error instanceof Error) {
			errorDetails.message = error.message;
			errorDetails.details.error = error.message;
		}

		// Check if it's a MySQL error
		if (error && typeof error === 'object' && 'code' in error) {
			const mysqlError = error as any;
			errorDetails.details.code = mysqlError.code;
			errorDetails.details.errno = mysqlError.errno;
			errorDetails.details.sqlState = mysqlError.sqlState;
			errorDetails.details.sqlMessage = mysqlError.sqlMessage;
			errorDetails.details.sql = mysqlError.sql;
			
			// Provide user-friendly messages based on MySQL error codes
			if (mysqlError.code === 'ECONNREFUSED') {
				errorDetails.message = 'Database connection refused - check if database server is running';
			} else if (mysqlError.code === 'ER_ACCESS_DENIED_ERROR') {
				errorDetails.message = 'Database access denied - check username and password';
			} else if (mysqlError.code === 'ER_BAD_DB_ERROR') {
				errorDetails.message = 'Database does not exist - check database name';
			} else if (mysqlError.code === 'PROTOCOL_CONNECTION_LOST') {
				errorDetails.message = 'Database connection lost - connection will be recreated';
			} else if (mysqlError.code === 'ECONNRESET') {
				errorDetails.message = 'Database connection reset - connection will be recreated';
			}
		}

		// Throw the detailed error
		throw new Error(JSON.stringify(errorDetails));
	}
}

export async function orderExists(orderNumber: string): Promise<string | null> {
	try {
		const conn = await getConnection();
		
		const [rows] = await conn.execute(
			"SELECT * FROM orders WHERE order_number = ?",
			[orderNumber]
		);
		
		const result = rows as any[];
		return result.length > 0 ? orderNumber : null;
	} catch (error) {
		console.error('Error in orderExists:', error);
		
		// Create detailed error information
		let errorDetails: {
			message: string;
			type: string;
			timestamp: string;
			details: {
				error?: string;
				code?: string;
				errno?: number;
				sqlState?: string;
				sqlMessage?: string;
				sql?: string;
				operation?: string;
				orderNumber?: string;
			};
		} = {
			message: 'Database operation failed',
			type: 'DATABASE_ERROR',
			timestamp: new Date().toISOString(),
			details: {
				operation: 'orderExists',
				orderNumber: orderNumber
			}
		};

		if (error instanceof Error) {
			errorDetails.message = error.message;
			errorDetails.details.error = error.message;
		}

		// Check if it's a MySQL error
		if (error && typeof error === 'object' && 'code' in error) {
			const mysqlError = error as any;
			errorDetails.details.code = mysqlError.code;
			errorDetails.details.errno = mysqlError.errno;
			errorDetails.details.sqlState = mysqlError.sqlState;
			errorDetails.details.sqlMessage = mysqlError.sqlMessage;
			errorDetails.details.sql = mysqlError.sql;
			
			// Provide user-friendly messages based on MySQL error codes
			if (mysqlError.code === 'ECONNREFUSED') {
				errorDetails.message = 'Database connection refused - check if database server is running';
			} else if (mysqlError.code === 'ER_ACCESS_DENIED_ERROR') {
				errorDetails.message = 'Database access denied - check username and password';
			} else if (mysqlError.code === 'ER_BAD_DB_ERROR') {
				errorDetails.message = 'Database does not exist - check database name';
			} else if (mysqlError.code === 'PROTOCOL_CONNECTION_LOST') {
				errorDetails.message = 'Database connection lost - connection will be recreated';
			} else if (mysqlError.code === 'ECONNRESET') {
				errorDetails.message = 'Database connection reset - connection will be recreated';
			}
		}

		// Throw the detailed error
		throw new Error(JSON.stringify(errorDetails));
	}
}

export async function getAllOrderNumbers(): Promise<string[]> {
	try {
		const conn = await getConnection();
		
		const [rows] = await conn.execute("SELECT order_number FROM orders");
		const result = rows as any[];
		
		return result.map(row => row.order_number);
	} catch (error) {
		console.error('Error in getAllOrderNumbers:', error);
		
		// Create detailed error information
		let errorDetails: {
			message: string;
			type: string;
			timestamp: string;
			details: {
				error?: string;
				code?: string;
				errno?: number;
				sqlState?: string;
				sqlMessage?: string;
				sql?: string;
				operation?: string;
			};
		} = {
			message: 'Database operation failed',
			type: 'DATABASE_ERROR',
			timestamp: new Date().toISOString(),
			details: {
				operation: 'getAllOrderNumbers'
			}
		};

		if (error instanceof Error) {
			errorDetails.message = error.message;
			errorDetails.details.error = error.message;
		}

		// Check if it's a MySQL error
		if (error && typeof error === 'object' && 'code' in error) {
			const mysqlError = error as any;
			errorDetails.details.code = mysqlError.code;
			errorDetails.details.errno = mysqlError.errno;
			errorDetails.details.sqlState = mysqlError.sqlState;
			errorDetails.details.sqlMessage = mysqlError.sqlMessage;
			errorDetails.details.sql = mysqlError.sql;
			
			// Provide user-friendly messages based on MySQL error codes
			if (mysqlError.code === 'ECONNREFUSED') {
				errorDetails.message = 'Database connection refused - check if database server is running';
			} else if (mysqlError.code === 'ER_ACCESS_DENIED_ERROR') {
				errorDetails.message = 'Database access denied - check username and password';
			} else if (mysqlError.code === 'ER_BAD_DB_ERROR') {
				errorDetails.message = 'Database does not exist - check database name';
			} else if (mysqlError.code === 'PROTOCOL_CONNECTION_LOST') {
				errorDetails.message = 'Database connection lost - connection will be recreated';
			} else if (mysqlError.code === 'ECONNRESET') {
				errorDetails.message = 'Database connection reset - connection will be recreated';
			}
		}

		// Throw the detailed error
		throw new Error(JSON.stringify(errorDetails));
	}
}

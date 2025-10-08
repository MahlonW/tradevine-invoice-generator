import { createConnection } from 'mysql2/promise';
import { env } from '$env/dynamic/private';

let connection: any = null;

export async function getConnection(): Promise<any> {
	if (!connection) {
		connection = await createConnection({
			host: env.DB_HOST || 'your-database-host',
			user: env.DB_USER || 'your-database-username',
			password: env.DB_PASSWORD || 'your-database-password',
			database: env.DB_NAME || 'your-database-name'
		});
	}
	return connection;
}

export async function createDatabase(): Promise<void> {
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
	}
}

export async function getInvoiceNumber(orderNumber: string): Promise<number> {
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
}

export async function orderExists(orderNumber: string): Promise<string | null> {
	const conn = await getConnection();
	
	const [rows] = await conn.execute(
		"SELECT * FROM orders WHERE order_number = ?",
		[orderNumber]
	);
	
	const result = rows as any[];
	return result.length > 0 ? orderNumber : null;
}

export async function getAllOrderNumbers(): Promise<string[]> {
	const conn = await getConnection();
	
	const [rows] = await conn.execute("SELECT order_number FROM orders");
	const result = rows as any[];
	
	return result.map(row => row.order_number);
}

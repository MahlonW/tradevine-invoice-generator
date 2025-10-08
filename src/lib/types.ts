export interface SalesOrder {
	OrderNumber: string;
	CustomerOrderReference: string;
	Customer: {
		FirstName: string;
	};
	GrandTotal: number;
	CreatedDate: string;
	SalesOrderLines: Array<{
		Name: string;
		Quantity: number;
		SellPriceIncTax: number;
		ID: string;
	}>;
	ShippingAddress: {
		AddressLine1?: string;
		AddressLine2?: string;
		AddressLine3?: string;
		TownCity?: string;
		PostalCode?: string;
	};
	RecipientName?: string;
	link_text?: string;
}

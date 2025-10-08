import type { SalesOrder } from './types';

export interface EditedLine {
	ID: string;
	Name: string;
	Quantity: number;
	SellPriceIncTax: number;
	link_text?: string;
	originalName: string;
	originalQuantity: number;
	originalPrice: number;
	isEdited: boolean;
}

export interface CustomProduct {
	ID: string;
	Name: string;
	Quantity: number;
	SellPriceIncTax: number;
	isCustom: boolean;
	isEdited: boolean;
}

export interface NewProduct {
	name: string;
	quantity: number;
	price: number;
}

export type { SalesOrder };

import { OrderStatus } from './types.js';
export declare const CURRENCY_SYMBOL = "\u20B9";
export declare const ORDER_STATUS_DETAILS: Record<OrderStatus, {
    label: string;
    step: number;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
}>;
export declare const ORDER_STATUS_PROGRESS: OrderStatus[];
export declare const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]>;
export declare const DEFAULT_STORE_SETTINGS: {
    store_name: string;
    logo_url: string;
    support_phone: string;
    support_email: string;
    delivery_fee_paise: number;
    minimum_order_paise: number;
    free_delivery_threshold_paise: number;
    is_store_open: boolean;
    serviceable_pincodes: string[];
    store_address: string;
};
export declare const INDIAN_STATES: readonly ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"];
//# sourceMappingURL=constants.d.ts.map
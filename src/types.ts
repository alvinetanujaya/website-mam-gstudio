export interface MenuItem {
  id: number;
  name: string;
  desc: string;
  price: number;
  category: "Makanan Utama" | "Cemilan" | "Minuman";
  featured: boolean;
  image: string;
}

export interface CustomizationOption {
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // Unique ID for this cart entry (can combine item ID + sorted customizations)
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: CustomizationOption[];
  unitPrice: number; // base price + options price
}

export interface CustomerDetails {
  fullName: string;
  deliveryAddress: string;
  deliveryDate: string;
  notes: string;
}

export interface SnapPayOptions {
  onSuccess?: (result: any) => void;
  onPending?: (result: any) => void;
  onError?: (result: any) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: SnapPayOptions) => void;
      embed?: (token: string, options?: { embedId: string }) => void;
    };
  }
}

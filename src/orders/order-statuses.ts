import { OrderStatus } from '@prisma/client';

export type OrderStatusMeta = {
  label: string;
  description: string;
  sort_order: number;
  is_terminal: boolean;
};

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  [OrderStatus.pending]: {
    label: 'Pending',
    description: 'Order placed and awaiting confirmation',
    sort_order: 1,
    is_terminal: false,
  },
  [OrderStatus.accepted]: {
    label: 'Accepted',
    description: 'Order confirmed and being prepared',
    sort_order: 2,
    is_terminal: false,
  },
  [OrderStatus.out_for_delivery]: {
    label: 'Out for Delivery',
    description: 'Order is on the way to the customer',
    sort_order: 3,
    is_terminal: false,
  },
  [OrderStatus.delivered]: {
    label: 'Delivered',
    description: 'Order delivered successfully',
    sort_order: 4,
    is_terminal: true,
  },
  [OrderStatus.cancelled]: {
    label: 'Cancelled',
    description: 'Order was cancelled',
    sort_order: 5,
    is_terminal: true,
  },
  [OrderStatus.refunded]: {
    label: 'Refunded',
    description: 'Order payment was refunded',
    sort_order: 6,
    is_terminal: true,
  },
};

export const ORDER_STATUSES = Object.values(OrderStatus);

import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface MobileModule {
  id: string;
  title: string;
  label: string;
  icon: IoniconsName;
  iconColor: string;
  bgColor: string;
  route?: string;
}

export const MOBILE_MODULES: MobileModule[] = [
  {
    id: 'order-management',
    title: 'Gestión de Pedidos',
    label: 'Pedidos',
    icon: 'cube',
    iconColor: '#7C3AED',
    bgColor: '#F3EEFF',
    route: '/(authenticated)/(tabs)/ordenes',
  },
  {
    id: 'crm',
    title: 'CRM Ventas',
    label: 'CRM',
    icon: 'people',
    iconColor: '#276EF1',
    bgColor: '#EBF2FF',
  },
  {
    id: 'inventory',
    title: 'CountPro',
    label: 'CountPro',
    icon: 'calculator',
    iconColor: '#05A357',
    bgColor: '#E8F8EF',
  },
  {
    id: 'production',
    title: 'Producción',
    label: 'Producción',
    icon: 'construct',
    iconColor: '#E97400',
    bgColor: '#FFF3E6',
  },
  {
    id: 'planmaster',
    title: 'PlanMaster',
    label: 'PlanMaster',
    icon: 'calendar',
    iconColor: '#4338CA',
    bgColor: '#EEF0FF',
  },
  {
    id: 'store-visits',
    title: 'Visitas a Tiendas',
    label: 'Visitas',
    icon: 'clipboard',
    iconColor: '#0D9488',
    bgColor: '#E6FAF8',
  },
  {
    id: 'recepcion-pt',
    title: 'Recepción PT',
    label: 'Recepción',
    icon: 'archive',
    iconColor: '#0891B2',
    bgColor: '#E6F7FB',
  },
  {
    id: 'compras',
    title: 'Compras',
    label: 'Compras',
    icon: 'car',
    iconColor: '#CA8A04',
    bgColor: '#FEF9E7',
  },
  {
    id: 'kardex',
    title: 'Kardex',
    label: 'Kardex',
    icon: 'list',
    iconColor: '#6B7280',
    bgColor: '#F3F4F6',
  },
  {
    id: 'nucleo',
    title: 'Núcleo de Productos',
    label: 'Productos',
    icon: 'server',
    iconColor: '#DC2626',
    bgColor: '#FEF2F2',
  },
  {
    id: 'hr',
    title: 'Recursos Humanos',
    label: 'RRHH',
    icon: 'person-circle',
    iconColor: '#7C3AED',
    bgColor: '#F3EEFF',
  },
  {
    id: 'global-settings',
    title: 'Configuraciones',
    label: 'Config',
    icon: 'settings',
    iconColor: '#6B7280',
    bgColor: '#F3F4F6',
  },
];

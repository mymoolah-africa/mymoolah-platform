import React from 'react';

// Fallback icons when lucide-react is not available
const createFallbackIcon = (name: string) => {
  return ({ className = "w-4 h-4", style = {} }: { className?: string; style?: React.CSSProperties }) => (
    <div 
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e5e5e5',
        borderRadius: '2px',
        fontSize: '8px',
        fontWeight: 'bold',
        color: '#666',
        ...style
      }}
      title={name}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

// Try to import lucide-react icons, fallback to simple icons if not available
let Eye, EyeOff, Phone, User, Hash, Check, X, AlertTriangle, FileText, Shield, HelpCircle, Info, CheckCircle;
let Send, Receipt, Ticket, Plus, ArrowUpRight, ArrowDownLeft, Bell, Settings, TrendingUp;
let Loader2, Clock, CreditCard, Home, Upload, Camera, ArrowLeft;
let ShoppingBag, Wifi, Coffee, Car, ChevronRight;

try {
  // Attempt to import from lucide-react
  const lucideIcons = require('lucide-react');
  
  Eye = lucideIcons.Eye;
  EyeOff = lucideIcons.EyeOff;
  Phone = lucideIcons.Phone;
  User = lucideIcons.User;
  Hash = lucideIcons.Hash;
  Check = lucideIcons.Check;
  X = lucideIcons.X;
  AlertTriangle = lucideIcons.AlertTriangle;
  FileText = lucideIcons.FileText;
  Shield = lucideIcons.Shield;
  HelpCircle = lucideIcons.HelpCircle;
  Info = lucideIcons.Info;
  CheckCircle = lucideIcons.CheckCircle;
  Send = lucideIcons.Send;
  Receipt = lucideIcons.Receipt;
  Ticket = lucideIcons.Ticket;
  Plus = lucideIcons.Plus;
  ArrowUpRight = lucideIcons.ArrowUpRight;
  ArrowDownLeft = lucideIcons.ArrowDownLeft;
  Bell = lucideIcons.Bell;
  Settings = lucideIcons.Settings;
  TrendingUp = lucideIcons.TrendingUp;
  Loader2 = lucideIcons.Loader2;
  Clock = lucideIcons.Clock;
  CreditCard = lucideIcons.CreditCard;
  Home = lucideIcons.Home;
  Upload = lucideIcons.Upload;
  Camera = lucideIcons.Camera;
  ArrowLeft = lucideIcons.ArrowLeft;
  ShoppingBag = lucideIcons.ShoppingBag;
  Wifi = lucideIcons.Wifi;
  Coffee = lucideIcons.Coffee;
  Car = lucideIcons.Car;
  ChevronRight = lucideIcons.ChevronRight;
} catch (error) {
  console.warn('lucide-react not available, using fallback icons');
  
  // Create fallback icons
  Eye = createFallbackIcon('Eye');
  EyeOff = createFallbackIcon('EyeOff');
  Phone = createFallbackIcon('Phone');
  User = createFallbackIcon('User');
  Hash = createFallbackIcon('Hash');
  Check = createFallbackIcon('Check');
  X = createFallbackIcon('X');
  AlertTriangle = createFallbackIcon('Alert');
  FileText = createFallbackIcon('File');
  Shield = createFallbackIcon('Shield');
  HelpCircle = createFallbackIcon('Help');
  Info = createFallbackIcon('Info');
  CheckCircle = createFallbackIcon('CheckCircle');
  Send = createFallbackIcon('Send');
  Receipt = createFallbackIcon('Receipt');
  Ticket = createFallbackIcon('Ticket');
  Plus = createFallbackIcon('Plus');
  ArrowUpRight = createFallbackIcon('ArrowUp');
  ArrowDownLeft = createFallbackIcon('ArrowDown');
  Bell = createFallbackIcon('Bell');
  Settings = createFallbackIcon('Settings');
  TrendingUp = createFallbackIcon('Trend');
  Loader2 = createFallbackIcon('Load');
  Clock = createFallbackIcon('Clock');
  CreditCard = createFallbackIcon('Card');
  Home = createFallbackIcon('Home');
  Upload = createFallbackIcon('Upload');
  Camera = createFallbackIcon('Camera');
  ArrowLeft = createFallbackIcon('Back');
  ShoppingBag = createFallbackIcon('Shop');
  Wifi = createFallbackIcon('Wifi');
  Coffee = createFallbackIcon('Coffee');
  Car = createFallbackIcon('Car');
  ChevronRight = createFallbackIcon('>');
}

const Icons = {
  Eye,
  EyeOff,
  Phone,
  User,
  Hash,
  Check,
  X,
  AlertTriangle,
  FileText,
  Shield,
  HelpCircle,
  Info,
  CheckCircle,
  Send,
  Receipt,
  Ticket,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
  Settings,
  TrendingUp,
  Loader2,
  Clock,
  CreditCard,
  Home,
  Upload,
  Camera,
  ArrowLeft,
  ShoppingBag,
  Wifi,
  Coffee,
  Car,
  ChevronRight
};

// Export all icons
export {
  Eye,
  EyeOff,
  Phone,
  User,
  Hash,
  Check,
  X,
  AlertTriangle,
  FileText,
  Shield,
  HelpCircle,
  Info,
  CheckCircle,
  Send,
  Receipt,
  Ticket,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
  Settings,
  TrendingUp,
  Loader2,
  Clock,
  CreditCard,
  Home,
  Upload,
  Camera,
  ArrowLeft,
  ShoppingBag,
  Wifi,
  Coffee,
  Car,
  ChevronRight
};
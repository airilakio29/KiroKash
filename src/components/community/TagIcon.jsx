import React from 'react';
import {
  Banknote,
  ShieldCheck,
  GraduationCap,
  Moon,
  Wifi,
  Utensils,
  Wind,
  Coffee,
  Leaf,
  Tag,
  ShoppingBag,
  Trophy,
  BookOpen,
  Wrench,
  Ticket,
  Sparkles
} from 'lucide-react';

export default function TagIcon({ tagId, iconName, size = 13, className = '' }) {
  const resolved = iconName || tagId;
  switch (resolved) {
    case 'makan':
    case 'porsi-besar':
    case 'Utensils':
      return <Utensils size={size} className={className} />;
    case 'thrift':
    case 'ShoppingBag':
      return <ShoppingBag size={size} className={className} />;
    case 'activities':
    case 'Trophy':
      return <Trophy size={size} className={className} />;
    case 'study':
    case 'BookOpen':
      return <BookOpen size={size} className={className} />;
    case 'services':
    case 'Wrench':
      return <Wrench size={size} className={className} />;
    case 'events':
    case 'Ticket':
      return <Ticket size={size} className={className} />;
    case 'bawah-rm10':
    case 'Banknote':
      return <Banknote size={size} className={className} />;
    case 'halal':
    case 'ShieldCheck':
      return <ShieldCheck size={size} className={className} />;
    case 'student-deal':
    case 'GraduationCap':
      return <GraduationCap size={size} className={className} />;
    case 'buka-lewat':
    case 'Moon':
      return <Moon size={size} className={className} />;
    case 'wifi-plug':
    case 'Wifi':
      return <Wifi size={size} className={className} />;
    case 'aircond':
    case 'Wind':
      return <Wind size={size} className={className} />;
    case 'mamak':
    case 'Coffee':
      return <Coffee size={size} className={className} />;
    case 'vegetarian':
    case 'Leaf':
      return <Leaf size={size} className={className} />;
    case 'Sparkles':
      return <Sparkles size={size} className={className} />;
    default:
      return <Tag size={size} className={className} />;
  }
}

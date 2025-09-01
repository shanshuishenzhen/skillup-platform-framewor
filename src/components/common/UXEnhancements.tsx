import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Moon, Sun, Keyboard, Eye, EyeOff, Volume2, VolumeX, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

/**
 * 用户体验增强组件集合
 * 提供主题切换、快捷键、无障碍功能等用户体验优化
 */

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  category?: string;
}

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * 快捷键Hook
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled || !shortcuts || shortcuts.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 忽略在输入框中的快捷键
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const shortcut = shortcuts.find(s => {
        const keys = s.key.toLowerCase().split('+');
        const pressedKeys = [];
        
        if (event.ctrlKey) pressedKeys.push('ctrl');
        if (event.altKey) pressedKeys.push('alt');
        if (event.shiftKey) pressedKeys.push('shift');
        if (event.metaKey) pressedKeys.push('meta');
        pressedKeys.push(event.key.toLowerCase());
        
        return keys.every(key => pressedKeys.includes(key)) && 
               keys.length === pressedKeys.length;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * 快捷键帮助面板
 */
export function KeyboardShortcutsHelp({ shortcuts }: { shortcuts: KeyboardShortcut[] }) {
  const [isVisible, setIsVisible] = useState(false);

  // 按类别分组快捷键
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || '通用';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  useKeyboardShortcuts({
    shortcuts: [{
      key: '?',
      description: '显示快捷键帮助',
      action: () => setIsVisible(!isVisible)
    }],
    enabled: true
  });

  if (!isVisible) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="fixed bottom-4 right-4 z-50"
              onClick={() => setIsVisible(true)}
            >
              <Keyboard className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>快捷键帮助 (?)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              快捷键帮助
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="font-medium mb-3">{category}</h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{shortcut.description}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {shortcut.key}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 主题切换Hook
 */
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (stored) {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = () => {
        const isDark = mediaQuery.matches;
        setResolvedTheme(isDark ? 'dark' : 'light');
        root.classList.toggle('dark', isDark);
      };
      
      updateTheme();
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    } else {
      setResolvedTheme(theme);
      root.classList.toggle('dark', theme === 'dark');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, resolvedTheme, setTheme };
}

/**
 * 主题切换按钮
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return resolvedTheme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />;
    }
    return theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />;
  };

  const getLabel = () => {
    if (theme === 'system') return '跟随系统';
    return theme === 'dark' ? '深色模式' : '浅色模式';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={toggleTheme}>
            {getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getLabel()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * 无障碍功能Hook
 */
export function useAccessibility() {
  const [settings, setSettings] = useState({
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    screenReader: false,
    fontSize: 16
  });

  useEffect(() => {
    const stored = localStorage.getItem('accessibility-settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    
    const root = document.documentElement;
    
    // 高对比度
    root.classList.toggle('high-contrast', settings.highContrast);
    
    // 大字体
    root.classList.toggle('large-text', settings.largeText);
    
    // 减少动画
    root.classList.toggle('reduce-motion', settings.reduceMotion);
    
    // 字体大小
    root.style.fontSize = `${settings.fontSize}px`;
    
  }, [settings]);

  const updateSetting = useCallback((key: keyof typeof settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return { settings, updateSetting };
}

/**
 * 无障碍设置面板
 */
export function AccessibilityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting } = useAccessibility();

  if (!isOpen) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="fixed bottom-16 right-4 z-50"
              onClick={() => setIsOpen(true)}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>无障碍设置</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              无障碍设置
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">高对比度</label>
              <Switch
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting('highContrast', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">大字体</label>
              <Switch
                checked={settings.largeText}
                onCheckedChange={(checked) => updateSetting('largeText', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">减少动画</label>
              <Switch
                checked={settings.reduceMotion}
                onCheckedChange={(checked) => updateSetting('reduceMotion', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">字体大小</label>
              <Slider
                value={[settings.fontSize]}
                onValueChange={([value]) => updateSetting('fontSize', value)}
                min={12}
                max={24}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-center">
                {settings.fontSize}px
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 性能监控Hook
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    fps: 0
  });

  useEffect(() => {
    // 页面加载时间
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    setMetrics(prev => ({ ...prev, loadTime }));

    // FPS监控
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setMetrics(prev => ({ ...prev, fps: frameCount }));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);

    // 内存使用监控
    const updateMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024)
        }));
      }
    };
    
    const memoryInterval = setInterval(updateMemory, 5000);
    return () => clearInterval(memoryInterval);
  }, []);

  return metrics;
}

/**
 * 性能指示器
 */
export function PerformanceIndicator() {
  const [isVisible, setIsVisible] = useState(false);
  const metrics = usePerformanceMonitor();

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-28 right-4 z-50"
        onClick={() => setIsVisible(true)}
      >
        <Zap className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-28 right-4 z-50 w-48">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">性能监控</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>加载时间:</span>
          <span>{metrics.loadTime}ms</span>
        </div>
        <div className="flex justify-between">
          <span>FPS:</span>
          <span className={metrics.fps < 30 ? 'text-red-500' : 'text-green-500'}>
            {metrics.fps}
          </span>
        </div>
        <div className="flex justify-between">
          <span>内存:</span>
          <span>{metrics.memoryUsage}MB</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 焦点管理Hook
 */
export function useFocusManagement() {
  const focusRef = useRef<HTMLElement | null>(null);

  const setFocus = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.focus();
      focusRef.current = element;
    }
  }, []);

  const restoreFocus = useCallback(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, []);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { setFocus, restoreFocus, trapFocus };
}

export default {
  useKeyboardShortcuts,
  KeyboardShortcutsHelp,
  useTheme,
  ThemeToggle,
  useAccessibility,
  AccessibilityPanel,
  usePerformanceMonitor,
  PerformanceIndicator,
  useFocusManagement
};
/**
 * 观看日志管理组件
 * 提供查看、过滤、导出观看操作记录的功能
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Download, Filter, Search, Trash2, Eye, Calendar, User, Play } from 'lucide-react';
import { watchLogger, WatchLogEntry } from '@/utils/watchLogger';

interface WatchLogManagerProps {
  /** 是否显示管理界面 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 观看日志管理组件
 */
export const WatchLogManager: React.FC<WatchLogManagerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<WatchLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<WatchLogEntry[]>([]);
  const [filters, setFilters] = useState({
    userId: '',
    courseId: '',
    lessonId: '',
    action: '',
    startDate: '',
    endDate: '',
    searchText: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortBy, setSortBy] = useState<'timestamp' | 'action' | 'currentTime'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 加载日志数据
  useEffect(() => {
    if (isOpen) {
      const allLogs = watchLogger.getLogs();
      setLogs(allLogs);
    }
  }, [isOpen]);

  // 应用过滤器
  useEffect(() => {
    let filtered = [...logs];

    // 文本搜索
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(log => 
        log.courseId.toLowerCase().includes(searchLower) ||
        log.lessonId.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        (log.userId && log.userId.toLowerCase().includes(searchLower))
      );
    }

    // 用户ID过滤
    if (filters.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }

    // 课程ID过滤
    if (filters.courseId) {
      filtered = filtered.filter(log => log.courseId === filters.courseId);
    }

    // 课时ID过滤
    if (filters.lessonId) {
      filtered = filtered.filter(log => log.lessonId === filters.lessonId);
    }

    // 操作类型过滤
    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    // 日期范围过滤
    if (filters.startDate) {
      const startTime = new Date(filters.startDate).getTime();
      filtered = filtered.filter(log => log.timestamp >= startTime);
    }
    if (filters.endDate) {
      const endTime = new Date(filters.endDate + ' 23:59:59').getTime();
      filtered = filtered.filter(log => log.timestamp <= endTime);
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortBy) {
        case 'timestamp':
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        case 'action':
          aValue = a.action;
          bValue = b.action;
          break;
        case 'currentTime':
          aValue = a.currentTime;
          bValue = b.currentTime;
          break;
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [logs, filters, sortBy, sortOrder]);

  // 分页数据
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLogs.slice(startIndex, startIndex + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // 统计信息
  const stats = useMemo(() => {
    return watchLogger.getStats();
  }, [logs]);

  // 操作类型映射
  const actionLabels: Record<string, string> = {
    play: '播放',
    pause: '暂停',
    seek: '跳转',
    speed_change: '调速',
    volume_change: '音量',
    fullscreen: '全屏',
    mute: '静音',
    unmute: '取消静音',
    end: '结束'
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 格式化日期时间
  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 导出日志
  const handleExport = (format: 'json' | 'csv') => {
    const exportFilters = {
      userId: filters.userId || undefined,
      courseId: filters.courseId || undefined,
      lessonId: filters.lessonId || undefined,
      action: filters.action || undefined,
      startTime: filters.startDate ? new Date(filters.startDate).getTime() : undefined,
      endTime: filters.endDate ? new Date(filters.endDate + ' 23:59:59').getTime() : undefined
    };

    watchLogger.downloadLogs(format, exportFilters);
  };

  // 清空日志
  const handleClearLogs = () => {
    if (confirm('确定要清空所有观看日志吗？此操作不可恢复。')) {
      watchLogger.clearLogs();
      setLogs([]);
      setFilteredLogs([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-5/6 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Eye className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">观看日志管理</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 统计信息 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">总日志数</div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalLogs}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">播放次数</div>
              <div className="text-2xl font-bold text-green-600">{stats.actionCounts.play || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">暂停次数</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.actionCounts.pause || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">跳转次数</div>
              <div className="text-2xl font-bold text-purple-600">{stats.actionCounts.seek || 0}</div>
            </div>
          </div>
        </div>

        {/* 过滤器和操作 */}
        <div className="p-6 border-b space-y-4">
          {/* 搜索和快速过滤 */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索课程ID、课时ID、用户ID或操作类型..."
                  value={filters.searchText}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={filters.action}
              onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有操作</option>
              {Object.entries(actionLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* 详细过滤器 */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <input
              type="text"
              placeholder="用户ID"
              value={filters.userId}
              onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="课程ID"
              value={filters.courseId}
              onChange={(e) => setFilters(prev => ({ ...prev, courseId: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="课时ID"
              value={filters.lessonId}
              onChange={(e) => setFilters(prev => ({ ...prev, lessonId: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              placeholder="开始日期"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              placeholder="结束日期"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setFilters({
                userId: '',
                courseId: '',
                lessonId: '',
                action: '',
                startDate: '',
                endDate: '',
                searchText: ''
              })}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              清空过滤
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              显示 {filteredLogs.length} 条记录中的 {Math.min(pageSize, filteredLogs.length - (currentPage - 1) * pageSize)} 条
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>导出CSV</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>导出JSON</span>
              </button>
              <button
                onClick={handleClearLogs}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>清空日志</span>
              </button>
            </div>
          </div>
        </div>

        {/* 日志列表 */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'timestamp') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('timestamp');
                        setSortOrder('desc');
                      }
                    }}>
                  时间 {sortBy === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">课程</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'action') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('action');
                        setSortOrder('asc');
                      }
                    }}>
                  操作 {sortBy === 'action' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'currentTime') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('currentTime');
                        setSortOrder('asc');
                      }
                    }}>
                  视频位置 {sortBy === 'currentTime' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">播放状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">详情</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {log.userId || '未登录'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="truncate max-w-32" title={`${log.courseId}/${log.lessonId}`}>
                      {log.courseId.slice(-8)}/{log.lessonId.slice(-8)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      log.action === 'play' ? 'bg-green-100 text-green-800' :
                      log.action === 'pause' ? 'bg-yellow-100 text-yellow-800' :
                      log.action === 'seek' ? 'bg-purple-100 text-purple-800' :
                      log.action === 'speed_change' ? 'bg-blue-100 text-blue-800' :
                      log.action === 'end' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatTime(log.currentTime)} / {formatTime(log.duration)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center space-x-2 text-xs">
                      <span>速度: {log.playbackRate}x</span>
                      <span>音量: {Math.round(log.volume * 100)}%</span>
                      {log.muted && <span className="text-red-600">静音</span>}
                      {log.fullscreen && <span className="text-blue-600">全屏</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800">查看</summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded max-w-xs overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {filteredLogs.length > pageSize && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                第 {currentPage} 页，共 {Math.ceil(filteredLogs.length / pageSize)} 页
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  上一页
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(Math.ceil(filteredLogs.length / pageSize), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(filteredLogs.length / pageSize)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchLogManager;
import type { EChartsOption } from 'echarts';

import type { KnowledgeListItem, RecentResumeRecord, RecentTaskRecord, TaskStatus } from '@/types';

const chartPalette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9'];
const taskStatusOrder: TaskStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

function createAxisLabelStyle() {
  return {
    color: '#6b7280',
    fontSize: 11,
  };
}

function createSplitLineStyle() {
  return {
    lineStyle: {
      color: 'rgba(148, 163, 184, 0.18)',
    },
  };
}

function getUtcDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function shiftUtcDate(base: Date, offset: number): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + offset));
}

function formatDayLabelFromKey(dayKey: string): string {
  return dayKey.slice(5).replace('-', '-');
}

export function buildResourceOverviewOption(counts: {
  resumeCount: number;
  knowledgeCount: number;
  activeSessionCount: number;
  archivedSessionCount: number;
  inFlightTaskCount: number;
}): EChartsOption {
  return {
    color: chartPalette,
    animationDuration: 400,
    grid: {
      left: 20,
      right: 12,
      top: 12,
      bottom: 24,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: createAxisLabelStyle(),
      data: ['简历', '知识库', '活跃会话', '归档会话', '处理中任务'],
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: createAxisLabelStyle(),
      splitLine: createSplitLineStyle(),
    },
    series: [
      {
        type: 'bar',
        barWidth: '42%',
        itemStyle: {
          borderRadius: [10, 10, 0, 0],
        },
        data: [
          counts.resumeCount,
          counts.knowledgeCount,
          counts.activeSessionCount,
          counts.archivedSessionCount,
          counts.inFlightTaskCount,
        ],
      },
    ],
  };
}

export function buildTaskStatusOption(recentTasks: RecentTaskRecord[]): EChartsOption {
  const statusCountMap = new Map<TaskStatus, number>(taskStatusOrder.map((status) => [status, 0]));

  recentTasks.forEach((item) => {
    statusCountMap.set(item.taskStatus, (statusCountMap.get(item.taskStatus) ?? 0) + 1);
  });

  return {
    color: chartPalette,
    animationDuration: 400,
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      textStyle: createAxisLabelStyle(),
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '76%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        label: {
          color: '#111827',
          formatter: '{b}\n{c}',
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 3,
        },
        data: taskStatusOrder.map((status) => ({
          name: status,
          value: statusCountMap.get(status) ?? 0,
        })),
      },
    ],
  };
}

export function buildActivityTrendOption(
  recentResumes: RecentResumeRecord[],
  recentTasks: RecentTaskRecord[],
  nowInput = new Date().toISOString(),
): EChartsOption {
  const today = new Date(nowInput);
  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const offset = index - 6;
    return getUtcDateKey(shiftUtcDate(today, offset).toISOString());
  });
  const dayCountMap = new Map(dayKeys.map((key) => [key, 0]));

  [...recentResumes, ...recentTasks].forEach((item) => {
    const dayKey = getUtcDateKey(item.updatedAt);
    if (dayCountMap.has(dayKey)) {
      dayCountMap.set(dayKey, (dayCountMap.get(dayKey) ?? 0) + 1);
    }
  });

  return {
    color: ['#6366f1'],
    animationDuration: 400,
    grid: {
      left: 16,
      right: 16,
      top: 18,
      bottom: 24,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: createAxisLabelStyle(),
      data: dayKeys.map(formatDayLabelFromKey),
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: createAxisLabelStyle(),
      splitLine: createSplitLineStyle(),
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        areaStyle: {
          color: 'rgba(99, 102, 241, 0.14)',
        },
        lineStyle: {
          width: 3,
        },
        data: dayKeys.map((key) => dayCountMap.get(key) ?? 0),
      },
    ],
  };
}

export function buildKnowledgeCategoryOption(knowledgeList: KnowledgeListItem[]): EChartsOption {
  const categoryCountMap = new Map<string, number>();

  knowledgeList.forEach((item) => {
    const key = item.category || '未分类';
    categoryCountMap.set(key, (categoryCountMap.get(key) ?? 0) + 1);
  });

  const entries = Array.from(categoryCountMap.entries()).sort((left, right) => right[1] - left[1]).slice(0, 6);

  return {
    color: ['#0ea5e9'],
    animationDuration: 400,
    grid: {
      left: 16,
      right: 20,
      top: 12,
      bottom: 12,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: createAxisLabelStyle(),
      splitLine: createSplitLineStyle(),
    },
    yAxis: {
      type: 'category',
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: createAxisLabelStyle(),
      data: entries.map(([category]) => category),
    },
    series: [
      {
        type: 'bar',
        barWidth: 14,
        itemStyle: {
          borderRadius: 999,
        },
        data: entries.map(([, count]) => count),
      },
    ],
  };
}

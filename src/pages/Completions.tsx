import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trainingAPI } from '@/services/api';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileText, X } from 'lucide-react';
import { ShineBorder } from '@/components/magicui/shine-border';

export default function Completions() {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [level, setLevel] = useState<string>('all');
  const [facility, setFacility] = useState<string>('all');
  const [area, setArea] = useState<string>('all');

  const params = useMemo(() => ({
    startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
    endDate: endDate ? endDate.toISOString().split('T')[0] : undefined,
    level, facility, area
  }), [startDate, endDate, level, facility, area]);

  const hasFilters = useMemo(() => {
    return !!(params.startDate || params.endDate || (level && level !== 'all') || (facility && facility !== 'all') || (area && area !== 'all'));
  }, [params.startDate, params.endDate, level, facility, area]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['completions-aggregates', params],
    queryFn: () => trainingAPI.getCompletionsAggregates(params),
    staleTime: 2 * 60 * 1000,
  });

  // Load filter options for facility/area
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: () => trainingAPI.getFilterOptions(),
    staleTime: 10 * 60 * 1000,
  });

  // Auto-refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Completions & Counts"
        description="Filter by date, level, facility, and area to view aggregated counts"
      />

      <Card className="shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
        <CardContent>
          <div className="flex items-center gap-4 p-6">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-purple-900">Start:</div>
                <div className="relative inline-block w-[220px]">
                  <ShineBorder borderWidth={1} duration={20} shineColor={["#8b5cf6", "#a855f7", "#c084fc"]} className="rounded-md" />
                  <DatePicker date={startDate} onDateChange={setStartDate} placeholder="Start date" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-purple-900">End:</div>
                <div className="relative inline-block w-[220px]">
                  <ShineBorder borderWidth={1} duration={20} shineColor={["#8b5cf6", "#a855f7", "#c084fc"]} className="rounded-md" />
                  <DatePicker date={endDate} onDateChange={setEndDate} placeholder="End date" />
                </div>
              </div>
              <div className="w-px h-8 bg-purple-300" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-900">Filters:</span>
                <div className="flex items-center gap-3">
                  <div className="relative inline-block">
                    <ShineBorder borderWidth={1} duration={20} shineColor={["#8b5cf6", "#a855f7", "#c084fc"]} className="rounded-md" />
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger className="w-[160px] h-10 text-sm bg-white border-purple-200 shadow-sm"><SelectValue placeholder="All Levels" /></SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-sm border border-purple-200 shadow-lg">
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="Level 1">Level 1</SelectItem>
                        <SelectItem value="Level 2">Level 2</SelectItem>
                        <SelectItem value="Level 3">Level 3</SelectItem>
                        <SelectItem value="Consultant">Consultant</SelectItem>
                        <SelectItem value="Coach">Coach</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative inline-block">
                    <ShineBorder borderWidth={1} duration={20} shineColor={["#8b5cf6", "#a855f7", "#c084fc"]} className="rounded-md" />
                    <Select value={facility} onValueChange={setFacility}>
                      <SelectTrigger className="w-[180px] h-10 text-sm bg-white border-purple-200 shadow-sm"><SelectValue placeholder="All Facilities" /></SelectTrigger>
                      <SelectContent className="max-h-[300px] bg-white/95 backdrop-blur-sm border border-purple-200 shadow-lg">
                        <SelectItem value="all">All Facilities</SelectItem>
                        {(filterOptions?.facilities || []).map((f: string) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative inline-block">
                    <ShineBorder borderWidth={1} duration={20} shineColor={["#8b5cf6", "#a855f7", "#c084fc"]} className="rounded-md" />
                    <Select value={area} onValueChange={setArea}>
                      <SelectTrigger className="w-[160px] h-10 text-sm bg-white border-purple-200 shadow-sm"><SelectValue placeholder="All Areas" /></SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-sm border border-purple-200 shadow-lg">
                        <SelectItem value="all">All Areas</SelectItem>
                        {(filterOptions?.areas || []).sort((a: string, b: string) => {
                          const na = parseInt(a.replace(/\D/g, '')) || 0;
                          const nb = parseInt(b.replace(/\D/g, '')) || 0;
                          return na - nb;
                        }).map((a: string) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {hasFilters && (
                <>
                  <div className="w-px h-8 bg-purple-300" />
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="default"
                      size="sm"
                      onClick={() => { setStartDate(undefined); setEndDate(undefined); setLevel('all'); setFacility('all'); setArea('all'); }}
                      className="h-7 sm:h-8 px-2 sm:px-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg text-xs sm:text-sm"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Clear filters</span>
                      <span className="sm:hidden">Clear</span>
                    </Button>
                  </div>
                </>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Filter Indicator / Summary */}
      <div className="flex items-center gap-2">
        {!hasFilters ? (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-sm font-medium">
            Showing: Overall totals
          </span>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium">
              Filtered totals
            </span>
            {params.startDate && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200 text-xs font-medium">
                From: {params.startDate}
              </span>
            )}
            {params.endDate && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200 text-xs font-medium">
                To: {params.endDate}
              </span>
            )}
            {level !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-medium">
                Level: {level}
              </span>
            )}
            {facility !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-medium">
                Facility: {facility}
              </span>
            )}
            {area !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-xs font-medium">
                Area: {area}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-600">Failed to load aggregates</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-sm bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-green-700">Completed</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{data?.totals?.completed ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-700">Scheduled</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-700">{data?.totals?.scheduled ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700">In Progress</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{data?.totals?.inProgress ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-700">Awaiting</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{data?.totals?.awaiting ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700">Rejected</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{data?.totals?.rejected ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200/60">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            Breakdown by Level
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"></div>
                      Level
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"></div>
                      Completed
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div>
                      In Progress
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {(data?.byLevel || []).map((row: any, idx: number) => (
                  <tr 
                    key={row.level || idx} 
                    className="group hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-blue-50/30 transition-all duration-200"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center group-hover:from-purple-200 group-hover:to-indigo-200 transition-all duration-200">
                          <span className="text-sm font-bold text-purple-700">
                            {row.level?.replace('Level ', 'L') || '?'}
                          </span>
                        </div>
                        <span className="text-slate-800 font-semibold text-sm">
                          {row.level || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/60 shadow-sm group-hover:shadow-md transition-all duration-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 font-bold text-sm">
                          {row.completed || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 shadow-sm group-hover:shadow-md transition-all duration-200">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-700 font-bold text-sm">
                          {row.inProgress || 0}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data?.byLevel || data.byLevel.length === 0) && (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan={3}>
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                          <FileText className="h-6 w-6 text-slate-400" />
                        </div>
                        <div className="text-slate-500 font-medium">No data available</div>
                        <div className="text-slate-400 text-sm">Try adjusting your filters</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



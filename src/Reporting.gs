/** Source/campaign/lost-reason reporting, consumed by the Reports view. */

/** At-a-glance KPIs + an actionable "needs attention" list, for the Dashboard view. */
function getDashboardStats() {
  var leads = getAllLeads_();
  var today = startOfDay_(new Date());
  var weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  var active = leads.filter(function (l) { return l.Status === 'Active'; });
  var closedThisMonth = leads.filter(function (l) {
    return l.Stage === 'Close Out' && l['Last Updated'] && new Date(l['Last Updated']) >= monthStart;
  });
  var followUpsDue = active.filter(function (l) {
    return l['Next Follow-Up Date'] && startOfDay_(l['Next Follow-Up Date']) <= today;
  });
  var newThisWeek = leads.filter(function (l) {
    return l['Created Date'] && new Date(l['Created Date']) >= weekAgo;
  });
  var closedTotal = leads.filter(function (l) { return l.Stage === 'Close Out'; }).length;

  var needsAttention = active
    .filter(function (l) { return l['Next Follow-Up Date'] && startOfDay_(l['Next Follow-Up Date']) <= today; })
    .sort(function (a, b) { return new Date(a['Next Follow-Up Date']) - new Date(b['Next Follow-Up Date']); })
    .slice(0, 8)
    .map(function (l) {
      return {
        'Lead ID': l['Lead ID'], Name: l.Name, Phone: l.Phone, Stage: l.Stage,
        'Next Follow-Up Date': l['Next Follow-Up Date']
      };
    });

  return {
    activeCount: active.length,
    pipelineValue: sumValues_(active, 'Estimated Value'),
    closedThisMonthCount: closedThisMonth.length,
    closedThisMonthValue: sumValues_(closedThisMonth, 'Actual Value'),
    followUpsDueCount: followUpsDue.length,
    newThisWeekCount: newThisWeek.length,
    conversionRate: leads.length ? Math.round((closedTotal / leads.length) * 1000) / 10 : 0,
    needsAttention: needsAttention
  };
}

function getSourceReport() {
  var leads = getAllLeads_();

  return {
    bySource: aggregateBy_(leads, function (l) { return l.Source || '(none)'; }),
    byCampaign: aggregateBy_(leads, function (l) { return l['UTM Campaign'] || l['Source Detail'] || '(none)'; }),
    byUtmSource: aggregateBy_(leads.filter(function (l) { return l['UTM Source']; }), function (l) { return l['UTM Source']; }),
    lostReasons: countBy_(leads.filter(function (l) { return l.Status === 'Not Qualified'; }), function (l) { return l['Lost Reason'] || '(unspecified)'; }),
    totals: {
      leadCount: leads.length,
      closedCount: leads.filter(function (l) { return l.Stage === 'Close Out'; }).length,
      totalActualValue: sumValues_(leads, 'Actual Value')
    }
  };
}

function aggregateBy_(leads, keyFn) {
  var groups = {};
  leads.forEach(function (lead) {
    var key = keyFn(lead);
    if (!groups[key]) {
      groups[key] = {
        total: 0, active: 0, spam: 0, notQualified: 0, closed: 0,
        closeOutCount: 0, totalActualValue: 0, totalEstimatedValue: 0
      };
    }
    var g = groups[key];
    g.total++;
    if (lead.Status === 'Active') g.active++;
    if (lead.Status === 'Spam') g.spam++;
    if (lead.Status === 'Not Qualified') g.notQualified++;
    if (lead.Status === 'Closed') g.closed++;
    if (lead.Stage === 'Close Out') g.closeOutCount++;
    g.totalActualValue += Number(lead['Actual Value']) || 0;
    g.totalEstimatedValue += Number(lead['Estimated Value']) || 0;
  });
  Object.keys(groups).forEach(function (key) {
    var g = groups[key];
    g.conversionRate = g.total ? Math.round((g.closeOutCount / g.total) * 1000) / 10 : 0;
  });
  return groups;
}

function countBy_(leads, keyFn) {
  var counts = {};
  leads.forEach(function (lead) {
    var key = keyFn(lead);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function sumValues_(leads, field) {
  return leads.reduce(function (sum, l) { return sum + (Number(l[field]) || 0); }, 0);
}

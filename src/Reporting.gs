/** Source/campaign/lost-reason reporting, consumed by the Reports view. */

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

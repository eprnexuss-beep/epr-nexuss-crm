// Both pages use the saved status; no leads are copied or deleted.
export const filterLeadsByStatus = (leads, notInterestedOnly = false) =>
  leads.filter(lead => (lead.status === 'not_interested') === notInterestedOnly);

-- CreateIndex
CREATE INDEX "BhagMetric_businessId_idx" ON "BhagMetric"("businessId");

-- CreateIndex
CREATE INDEX "BhagMetricSnapshot_metricId_idx" ON "BhagMetricSnapshot"("metricId");

-- CreateIndex
CREATE INDEX "ImpersonationLog_businessId_idx" ON "ImpersonationLog"("businessId");

-- CreateIndex
CREATE INDEX "ImpersonationLog_adminId_idx" ON "ImpersonationLog"("adminId");

-- CreateIndex
CREATE INDEX "Initiative_keyResultId_idx" ON "Initiative"("keyResultId");

-- CreateIndex
CREATE INDEX "Issue_businessId_idx" ON "Issue"("businessId");

-- CreateIndex
CREATE INDEX "KeyResult_objectiveId_idx" ON "KeyResult"("objectiveId");

-- CreateIndex
CREATE INDEX "Membership_businessId_idx" ON "Membership"("businessId");

-- CreateIndex
CREATE INDEX "NextStep_businessId_assigneeId_idx" ON "NextStep"("businessId", "assigneeId");

-- CreateIndex
CREATE INDEX "WeeklyCheckIn_businessId_weekOf_idx" ON "WeeklyCheckIn"("businessId", "weekOf");

-- CreateIndex
CREATE INDEX "WinningMove_businessId_assigneeId_idx" ON "WinningMove"("businessId", "assigneeId");

              {/* Grid Schedule Tab */}
              <TabsContent value="grid" className="flex-1 mt-4">
                <div className="h-full">
                  <GridSchedule 
                    user={user}
                    demoRequests={allDemoRequests}
                    onUpdateDemoRequest={onUpdateDemoRequest}
                  />
                </div>
              </TabsContent>
      {/* Modals */}
      {showDemoDetail && selectedDemo && (
        <DemoDetailModal
          demo={selectedDemo}
          open={showDemoDetail}
          onClose={() => setShowDemoDetail(false)}
          onUpdate={onUpdateDemoRequest}
          userRole={user.role}
          onTestRecipePersistence={(demo) => {
            // Call the recipe persistence test handler if available
            if (user.role === 'head_chef') {
              console.log('🧪 Testing recipe persistence for:', demo.clientName);
            }
          }}
        />
      )}

      {showCreateTask && onAddTask && (
        <CreateTaskModal
          open={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          onCreate={handleCreateTask}
        />
      )}

      {showCreateKitchenRequest && (
        <CreateKitchenRequestModal
          open={showCreateKitchenRequest}
          onClose={() => setShowCreateKitchenRequest(false)}
          onCreateRequest={handleCreateKitchenRequest}
          user={user}
        />
      )}

      {showTeamManagement && (
        <TeamManagement
          open={showTeamManagement}
          onClose={() => setShowTeamManagement(false)}
        />
      )}
    </>
  );
}
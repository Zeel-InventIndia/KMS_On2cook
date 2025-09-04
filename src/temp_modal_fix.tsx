      {/* Modals */}
      {selectedDemo && (
        <DemoDetailModal
          demo={selectedDemo}
          user={user}
          open={showDemoDetail}
          onClose={() => {
            setShowDemoDetail(false);
            setSelectedDemo(null);
          }}
          onUpdate={onUpdateDemoRequest}
          onTestRecipePersistence={onTestRecipePersistence}
        />
      )}

      {user.role === 'head_chef' && (
        <>
          <CreateTaskModal
            open={showCreateTask}
            onClose={() => setShowCreateTask(false)}
            onCreate={handleCreateTask}
          />
          
          <CreateKitchenRequestModal
            open={showCreateKitchenRequest}
            onClose={() => setShowCreateKitchenRequest(false)}
            onCreateRequest={handleCreateKitchenRequest}
            user={user}
          />
          
          <TeamManagement
            open={showTeamManagement}
            onClose={() => setShowTeamManagement(false)}
          />
        </>
      )}
    </>
  );
}
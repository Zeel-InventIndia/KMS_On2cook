      {/* Modals */}
      {showDemoDetail && selectedDemo && (
        <DemoDetailModal
          demo={selectedDemo}
          isOpen={showDemoDetail}
          onClose={() => setShowDemoDetail(false)}
          onUpdate={onUpdateDemoRequest}
          currentUser={user}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          isOpen={showCreateTask}
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
          isOpen={showTeamManagement}
          onClose={() => setShowTeamManagement(false)}
        />
      )}

      {user.role === "presales" && (
        <RecipeRepositoryFromSheets />
      )}
    </>
  );
}
import { NextResponse } from 'next/server';
import User from '@/lib/models/User';
import Project from '@/lib/models/Project';
import Document from '@/lib/models/Document';
import { withAdmin, combineMiddlewares, withErrorHandling, AuthenticatedRequest } from '@/lib/middleware/auth';

// GET /api/admin/dashboard - Get admin dashboard analytics
async function getDashboardHandler(req: AuthenticatedRequest) {
  const [
    totalUsers,
    activeUsers,
    totalProjects,
    totalDocuments,
    recentUsers,
    topUsers,
    subscriptionStats,
    storageStats
  ] = await Promise.all([
    // Total users count
    User.countDocuments(),
    
    // Active users (logged in last 30 days)
    User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }),
    
    // Total projects
    Project.countDocuments({ status: { $ne: 'deleted' } }),
    
    // Total documents
    Document.countDocuments({ status: { $ne: 'deleted' } }),
    
    // Recent users (last 10)
    User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName email createdAt subscription.plan stats'),
    
    // Top users by project count
    User.find()
      .sort({ 'stats.projectsCount': -1 })
      .limit(5)
      .select('firstName lastName email stats subscription.plan'),
    
    // Subscription plan distribution
    User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ]),
    
    // Storage usage stats
    User.aggregate([
      {
        $group: {
          _id: null,
          totalStorage: { $sum: '$stats.storageUsed' },
          avgStorage: { $avg: '$stats.storageUsed' }
        }
      }
    ])
  ]);

  // User growth over last 7 days
  const userGrowth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Project creation over last 7 days
  const projectGrowth = await Project.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return NextResponse.json({
    success: true,
    data: {
      overview: {
        totalUsers,
        activeUsers,
        totalProjects,
        totalDocuments,
        inactiveUsers: totalUsers - activeUsers
      },
      growth: {
        users: userGrowth,
        projects: projectGrowth
      },
      subscriptions: subscriptionStats.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      storage: {
        total: storageStats[0]?.totalStorage || 0,
        average: Math.round(storageStats[0]?.avgStorage || 0)
      },
      recentUsers,
      topUsers
    }
  });
}

export const GET = combineMiddlewares(withErrorHandling, withAdmin)(getDashboardHandler);
